import {templatesFor} from '../data/licenses';
import {isHolding, materialGaps} from './obligations';
import type {ChangeEvent, Dependency, Fulfillment, LensState, Material, Obligation} from './types';
import {FULFILLMENT_LABEL, KIND_LABEL} from './types';

let seq = 0;
export function newId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`;
}

function pushEvent(state: LensState, ev: Omit<ChangeEvent, 'id' | 'at'>): ChangeEvent[] {
  return [{...ev, id: newId('ev'), at: Date.now()}, ...state.events].slice(0, 200);
}

export function addDependency(state: LensState, input: {name: string; version: string; license: string; source: string}): LensState {
  const dep: Dependency = {id: newId('dep'), ...input};
  const obligations: Obligation[] = templatesFor(dep.license).map(t => ({
    id: `${dep.id}:${t.kind}`,
    depId: dep.id,
    kind: t.kind,
    fulfillment: t.fulfillment,
    materialId: null,
    state: 'pending',
    note: '新登记依赖，待指派材料',
    updatedAt: Date.now(),
  }));
  const next: LensState = {...state, deps: [...state.deps, dep], obligations: [...state.obligations, ...obligations]};
  return {
    ...next,
    events: pushEvent(next, {
      reason: '登记依赖',
      detail: `${dep.name}@${dep.version}（${dep.license}）纳入清单，生成 ${obligations.length} 项义务待指派`,
      depId: dep.id,
      depName: dep.name,
    }),
  };
}

export function applyDepUpdate(state: LensState, depId: string, patch: {version?: string; license?: string}): LensState {
  const dep = state.deps.find(d => d.id === depId);
  if (!dep) return state;
  const version = (patch.version ?? '').trim() || dep.version;
  const license = (patch.license ?? '').trim() || dep.license;
  if (version === dep.version && license === dep.license) return state;
  const now = Date.now();
  const depObs = state.obligations.filter(o => o.depId === depId);
  let obligations = state.obligations;
  let detail: string;
  let reason: string;

  if (license !== dep.license) {
    reason = '许可证更换';
    const templates = templatesFor(license);
    const nextKinds = new Set(templates.map(t => t.kind));
    const dropped = depObs.filter(o => !nextKinds.has(o.kind));
    const added = templates.filter(t => !depObs.some(o => o.kind === t.kind));
    obligations = state.obligations
      .filter(o => !(o.depId === depId && !nextKinds.has(o.kind)))
      .map(o =>
        o.depId === depId && o.state === 'assigned'
          ? {...o, state: 'invalidated' as const, note: `许可证更换 ${dep.license} → ${license}，原指派失效`, updatedAt: now}
          : o,
      )
      .concat(
        added.map(t => ({
          id: `${depId}:${t.kind}`,
          depId,
          kind: t.kind,
          fulfillment: t.fulfillment,
          materialId: null,
          state: 'pending' as const,
          note: '许可证更换新增的义务，待指派材料',
          updatedAt: now,
        })),
      );
    const parts = [`${dep.license} → ${license}`];
    if (depObs.some(o => nextKinds.has(o.kind) && o.state === 'assigned')) parts.push('保留义务的原指派失效，材料保留可沿用');
    if (dropped.length) parts.push(`移除义务：${dropped.map(o => KIND_LABEL[o.kind]).join('、')}`);
    if (added.length) parts.push(`新增义务：${added.map(t => KIND_LABEL[t.kind]).join('、')}`);
    detail = parts.join('；');
  } else {
    reason = '依赖升级';
    const affected = depObs.filter(o => o.state === 'assigned');
    obligations = state.obligations.map(o =>
      o.depId === depId && o.state === 'assigned'
        ? {...o, state: 'invalidated' as const, note: `依赖升级 ${dep.version} → ${version}，原指派失效`, updatedAt: now}
        : o,
    );
    detail = affected.length
      ? `版本 ${dep.version} → ${version}，${affected.length} 项义务的原指派失效，材料保留可沿用`
      : `版本 ${dep.version} → ${version}，无已指派义务受影响`;
  }

  const next: LensState = {
    ...state,
    deps: state.deps.map(d => (d.id === depId ? {...d, version, license} : d)),
    obligations,
  };
  return {...next, events: pushEvent(next, {reason, detail, depId, depName: dep.name})};
}

export function assignObligation(state: LensState, obligationId: string, materialId: string): LensState {
  const ob = state.obligations.find(o => o.id === obligationId);
  const material = state.materials.find(m => m.id === materialId);
  if (!ob || !material) return state;
  const dep = state.deps.find(d => d.id === ob.depId);
  const obligations = state.obligations.map(o =>
    o.id === obligationId ? {...o, materialId, state: 'assigned' as const, note: '', updatedAt: Date.now()} : o,
  );
  const next: LensState = {...state, obligations};
  return {
    ...next,
    events: pushEvent(next, {
      reason: ob.state === 'invalidated' ? '重新指派' : '义务指派',
      detail: `${dep?.name ?? ob.depId} · ${KIND_LABEL[ob.kind]} → 「${material.title}」${isHolding(material) ? '（材料在暂缓区，补齐后生效）' : ''}`,
      depId: ob.depId,
      depName: dep?.name,
    }),
  };
}

export function assignToNewMaterial(state: LensState, obligationId: string, title: string): LensState {
  const ob = state.obligations.find(o => o.id === obligationId);
  if (!ob) return state;
  const material: Material = {
    id: newId('mat'),
    kind: ob.kind,
    fulfillment: ob.fulfillment,
    title: title.trim() || `${KIND_LABEL[ob.kind]}材料（${FULFILLMENT_LABEL[ob.fulfillment]}）`,
    body: '',
    owner: '',
    updatedAt: Date.now(),
  };
  return assignObligation({...state, materials: [...state.materials, material]}, obligationId, material.id);
}

export function updateMaterial(state: LensState, materialId: string, patch: {body?: string; owner?: string}): LensState {
  const material = state.materials.find(m => m.id === materialId);
  if (!material) return state;
  const wasHolding = materialGaps(material).length > 0;
  const nextMaterial: Material = {
    ...material,
    body: patch.body ?? material.body,
    owner: patch.owner ?? material.owner,
    updatedAt: Date.now(),
  };
  const next: LensState = {...state, materials: state.materials.map(m => (m.id === materialId ? nextMaterial : m))};
  if (wasHolding && materialGaps(nextMaterial).length === 0) {
    return {...next, events: pushEvent(next, {reason: '材料补齐', detail: `「${nextMaterial.title}」缺口已补齐，回到材料清单`})};
  }
  return next;
}

export function changeFulfillment(state: LensState, obligationId: string, fulfillment: Fulfillment): LensState {
  const ob = state.obligations.find(o => o.id === obligationId);
  if (!ob || ob.fulfillment === fulfillment) return state;
  const dep = state.deps.find(d => d.id === ob.depId);
  const obligations = state.obligations.map(o =>
    o.id === obligationId
      ? {...o, fulfillment, materialId: null, state: 'pending' as const, note: `交付方式调整为${FULFILLMENT_LABEL[fulfillment]}，需重新指派材料`, updatedAt: Date.now()}
      : o,
  );
  const next: LensState = {...state, obligations};
  return {
    ...next,
    events: pushEvent(next, {
      reason: '交付方式调整',
      detail: `${dep?.name ?? ob.depId} · ${KIND_LABEL[ob.kind]}：${FULFILLMENT_LABEL[ob.fulfillment]} → ${FULFILLMENT_LABEL[fulfillment]}，原指派解除`,
      depId: ob.depId,
      depName: dep?.name,
    }),
  };
}
