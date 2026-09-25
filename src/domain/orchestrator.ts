// 判定层（orchestrator）：
// 纯函数。根据资料层的规则推导每个依赖的义务及其交付方式，
// 负责材料编排、暂缓缺口、升级/换照失效留痕。不碰 localStorage、不碰 React。
import {
  LICENSES,
  MATERIAL_CATALOG,
  MATERIAL_ORDER,
  SEED_DEPS,
  SEED_LICENSE_TEXTS,
  SEED_MATERIALS,
} from './catalog';
import type {
  AppState,
  Assignment,
  ChangeEvent,
  DeliveryMode,
  Dep,
  InvalidationReason,
  Material,
  MaterialKind,
  ObligationKind,
} from './types';

/* ---------------- 基础推导 ---------------- */

export interface ExpectedObligation {
  depId: string;
  kind: ObligationKind;
  mode: Exclude<DeliveryMode, 'none'>;
  materialId: string;
}

/** 某依赖某义务当前生效的交付方式（覆盖优先于许可证默认） */
export function resolveMode(state: AppState, depId: string, kind: ObligationKind, licenseId: string) {
  const override = state.modeOverrides.find((o) => o.depId === depId && o.kind === kind);
  if (override) return override.mode;
  const spec = LICENSES[licenseId];
  if (kind === 'source') return spec?.sourceMode ?? 'bundled';
  if (kind === 'changes') return spec?.changesMode ?? 'bundled';
  return 'bundled' as const;
}

export function materialIdFor(kind: ObligationKind, mode: Exclude<DeliveryMode, 'none'>): string {
  if (kind === 'notice') return 'mat-notice';
  if (kind === 'source') return mode === 'bundled' ? 'mat-source-bundled' : 'mat-source-link';
  return mode === 'bundled' ? 'mat-changes-bundled' : 'mat-changes-link';
}

/** 一个依赖此刻应当履行的全部义务（署名恒随包；修改披露仅在 modified 时） */
export function obligationsOf(state: AppState, dep: Dep): ExpectedObligation[] {
  const spec = LICENSES[dep.licenseId];
  if (!spec) return [];
  return spec.obligations
    .filter((kind) => kind !== 'changes' || dep.modified)
    .map((kind) => {
      const mode = resolveMode(state, dep.id, kind, dep.licenseId);
      return {depId: dep.id, kind, mode, materialId: materialIdFor(kind, mode)};
    });
}

export function allExpected(state: AppState): ExpectedObligation[] {
  return state.deps.flatMap((d) => obligationsOf(state, d));
}

/* ---------------- ID / 事件 ---------------- */

function nextId(state: AppState, prefix: string): string {
  const all = [...state.assignments, ...state.events].map((i) => i.id);
  const max = all.reduce((m, id) => {
    const n = parseInt(id.split('-')[1] || '0', 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `${prefix}-${max + 1}`;
}

function addEvent(
  state: AppState,
  kind: ChangeEvent['kind'],
  message: string,
  refs: {depId?: string; materialId?: string} = {},
  resolved = false,
): ChangeEvent {
  const ev: ChangeEvent = {
    id: nextId(state, 'ev'),
    at: Date.now(),
    kind,
    message,
    resolved,
    ...refs,
  };
  state.events.push(ev);
  return ev;
}

/* ---------------- 初始编排 ---------------- */

export function createInitialState(): AppState {
  const state: AppState = {
    version: 1,
    deps: SEED_DEPS.map((d) => ({...d})),
    materials: SEED_MATERIALS.map((m) => ({...m})),
    assignments: [],
    modeOverrides: [],
    licenseTexts: SEED_LICENSE_TEXTS.map((t) => ({...t})),
    changeNotes: [],
    events: [],
  };
  const seed = addEvent(state, 'add-dep', '初始编排：扫描到 5 个依赖，按许可证规则生成义务引用', {}, true);
  for (const exp of allExpected(state)) {
    state.assignments.push(mkAssignment(state, exp, seed.id, 'active'));
  }
  return state;
}

function mkAssignment(state: AppState, exp: ExpectedObligation, eventId: string, asgState: Assignment['state']): Assignment {
  const n = state.assignments.length + 1;
  return {
    id: `asg-seed-${n}-${exp.depId}-${exp.kind}`,
    materialId: exp.materialId,
    depId: exp.depId,
    kind: exp.kind,
    mode: exp.mode,
    state: asgState,
    sinceEventId: eventId,
  };
}

/* ---------------- 引用失效 / 重生（只让原指派失效） ---------------- */

function invalidateRefs(
  state: AppState,
  pred: (a: Assignment) => boolean,
  reason: InvalidationReason,
  detail: string,
  eventId: string,
) {
  for (const a of state.assignments) {
    if (a.state !== 'invalidated' && pred(a)) {
      a.state = 'invalidated';
      a.invalidReason = reason;
      a.invalidDetail = detail;
      a.invalidatedEventId = eventId;
    }
  }
}

/** 为期望义务生成 proposed 引用；同模式的旧条目可沿用其已填链接/源码包位置 */
function proposeFor(
  state: AppState,
  exps: ExpectedObligation[],
  eventId: string,
  previous: Assignment[],
) {
  for (const exp of exps) {
    const carry = previous.find((p) => p.depId === exp.depId && p.kind === exp.kind && p.mode === exp.mode && p.state === 'invalidated');
    const n = state.assignments.length + 1;
    const asg: Assignment = {
      id: `asg-${eventId}-${n}`,
      materialId: exp.materialId,
      depId: exp.depId,
      kind: exp.kind,
      mode: exp.mode,
      state: 'proposed',
      sinceEventId: eventId,
      linkUrl: carry?.linkUrl,
      artifact: carry?.artifact,
    };
    state.assignments.push(asg);
  }
}

function depName(state: AppState, depId: string) {
  return state.deps.find((d) => d.id === depId)?.name ?? depId;
}

/* ---------------- 状态转移操作 ---------------- */

export function addDep(state: AppState, input: {name: string; licenseId: string; version?: string; source?: string}): AppState {
  const s = clone(state);
  const id = `dep-${input.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now().toString(36)}`;
  const dep: Dep = {
    id,
    name: input.name.trim(),
    version: input.version?.trim() || '1.0.0',
    licenseId: input.licenseId,
    source: input.source?.trim() || '手动',
    modified: false,
    note: '手动添加，请核对分发义务',
  };
  s.deps.push(dep);
  const ev = addEvent(s, 'add-dep', `新增依赖 ${dep.name}@${dep.version}（${dep.licenseId}），生成义务引用待确认`, {depId: id});
  proposeFor(s, obligationsOf(s, dep), ev.id, []);
  return s;
}

/** 依赖升级：仅该依赖的原指派失效，其他材料沿用；新版本义务重新提案 */
export function upgradeDep(state: AppState, depId: string, newVersion: string): AppState {
  const s = clone(state);
  const dep = s.deps.find((d) => d.id === depId);
  if (!dep || !newVersion.trim() || newVersion.trim() === dep.version) return state;
  const oldVersion = dep.version;
  const previous = s.assignments.filter((a) => a.depId === depId);
  const ev = addEvent(s, 'upgrade', `${dep.name} 升级 ${oldVersion} → ${newVersion.trim()}：原版本义务指派已失效，新版本引用待确认`, {depId: depId});
  invalidateRefs(s, (a) => a.depId === depId, 'upgrade', `升级前版本 ${oldVersion}`, ev.id);
  dep.version = newVersion.trim();
  proposeFor(s, obligationsOf(s, dep), ev.id, previous);
  return s;
}

/** 许可证更换：旧许可证下的指派失效，按新许可证重新提案；其他依赖材料不动 */
export function changeLicense(state: AppState, depId: string, licenseId: string): AppState {
  const s = clone(state);
  const dep = s.deps.find((d) => d.id === depId);
  if (!dep || licenseId === dep.licenseId) return state;
  const oldLicense = dep.licenseId;
  const previous = s.assignments.filter((a) => a.depId === depId);
  const ev = addEvent(s, 'license-change', `${dep.name} 许可证更换 ${oldLicense} → ${licenseId}：原指派失效，按新许可证重新编排`, {depId: depId});
  invalidateRefs(s, (a) => a.depId === depId, 'license-change', `原许可证 ${oldLicense}`, ev.id);
  dep.licenseId = licenseId;
  s.modeOverrides = s.modeOverrides.filter((o) => o.depId !== depId);
  proposeFor(s, obligationsOf(s, dep), ev.id, previous);
  return s;
}

/** 修改标记翻转：只让受影响（新增/消失/换方式）的义务指派失效 */
export function setModified(state: AppState, depId: string, modified: boolean): AppState {
  const s = clone(state);
  const dep = s.deps.find((d) => d.id === depId);
  if (!dep || modified === dep.modified) return state;
  const before = obligationsOf(s, dep);
  dep.modified = modified;
  const after = obligationsOf(s, dep);
  const key = (e: {kind: ObligationKind; mode: string; materialId: string}) => `${e.kind}|${e.mode}|${e.materialId}`;
  const beforeMap = new Map(before.map((e) => [e.kind, e]));
  const afterMap = new Map(after.map((e) => [e.kind, e]));
  const changedKinds: ObligationKind[] = [];
  for (const [kind, a] of beforeMap) {
    const b = afterMap.get(kind);
    if (!b || key(b) !== key(a)) changedKinds.push(kind);
  }
  for (const kind of afterMap.keys()) if (!beforeMap.has(kind)) changedKinds.push(kind);
  if (!changedKinds.length) return state;
  const ev = addEvent(
    s,
    'modification-change',
    modified
      ? `标记 ${dep.name} 已修改源码：新增/调整修改披露等义务，原指派失效`
      : `取消 ${dep.name} 的已修改标记：修改披露义务撤销，相关指派失效`,
    {depId},
  );
  const previous = s.assignments.filter((a) => a.depId === depId);
  invalidateRefs(s, (a) => a.depId === depId && changedKinds.includes(a.kind), 'modification-change', modified ? '标记为已修改' : '取消已修改标记', ev.id);
  const next = after.filter((e) => changedKinds.includes(e.kind));
  proposeFor(s, next, ev.id, previous);
  return s;
}

/** 切换某依赖某义务的交付方式（外链↔随包）：仅该指派失效并在目标材料重新提案 */
export function setMode(state: AppState, depId: string, kind: ObligationKind, mode: Exclude<DeliveryMode, 'none'>): AppState {
  const s = clone(state);
  const dep = s.deps.find((d) => d.id === depId);
  if (!dep) return state;
  const current = resolveMode(s, depId, kind, dep.licenseId);
  if (current === mode) return state;
  const previous = s.assignments.filter((a) => a.depId === depId && a.kind === kind);
  const ev = addEvent(s, 'mode-change', `${dep.name} 的${kind === 'source' ? '源码交付' : '修改披露'}改为${mode === 'bundled' ? '随包' : '外链'}：原指派失效`, {depId});
  invalidateRefs(s, (a) => a.depId === depId && a.kind === kind && a.state !== 'invalidated', 'mode-change', `改为${mode === 'bundled' ? '随包' : '外链'}`, ev.id);
  const existing = s.modeOverrides.findIndex((o) => o.depId === depId && o.kind === kind);
  const specDefault = kind === 'source' ? LICENSES[dep.licenseId]?.sourceMode : LICENSES[dep.licenseId]?.changesMode;
  if (specDefault === mode || (kind === 'notice' && mode === 'bundled')) {
    if (existing >= 0) s.modeOverrides.splice(existing, 1);
  } else if (existing >= 0) s.modeOverrides[existing].mode = mode;
  else s.modeOverrides.push({depId, kind, mode});
  proposeFor(s, obligationsOf(s, dep).filter((o) => o.kind === kind), ev.id, previous);
  return s;
}

export function claimMaterial(state: AppState, materialId: string, owner: string): AppState {
  const s = clone(state);
  const m = s.materials.find((x) => x.id === materialId);
  if (!m || !owner.trim()) return state;
  const wasEmpty = !m.owner;
  m.owner = owner.trim();
  if (wasEmpty) addEvent(s, 'claim', `材料《${MATERIAL_CATALOG[m.kind].name}》由 ${m.owner} 认领`, {materialId}, true);
  return s;
}

export function fillLicenseText(state: AppState, licenseId: string, text: string): AppState {
  const s = clone(state);
  if (!text.trim()) return state;
  const existed = s.licenseTexts.some((t) => t.licenseId === licenseId);
  s.licenseTexts = s.licenseTexts.filter((t) => t.licenseId !== licenseId);
  s.licenseTexts.push({licenseId, text: text.trim()});
  addEvent(s, 'fill-text', `${existed ? '更新' : '补录'}许可证正文：${licenseId}`, {}, true);
  return s;
}

export function fillChangeNote(state: AppState, depId: string, text: string): AppState {
  const s = clone(state);
  if (!text.trim()) return state;
  s.changeNotes = s.changeNotes.filter((n) => n.depId !== depId);
  s.changeNotes.push({depId, text: text.trim()});
  addEvent(s, 'fill-note', `补录 ${depName(s, depId)} 的修改说明`, {depId}, true);
  return s;
}

export function setAssignmentLink(state: AppState, assignmentId: string, url: string): AppState {
  const s = clone(state);
  const a = s.assignments.find((x) => x.id === assignmentId);
  if (!a) return state;
  a.linkUrl = url.trim();
  return s;
}

export function setAssignmentArtifact(state: AppState, assignmentId: string, artifact: string): AppState {
  const s = clone(state);
  const a = s.assignments.find((x) => x.id === assignmentId);
  if (!a) return state;
  a.artifact = artifact.trim();
  return s;
}

export function confirmAssignment(state: AppState, assignmentId: string): AppState {
  const s = clone(state);
  const a = s.assignments.find((x) => x.id === assignmentId);
  if (!a || a.state !== 'proposed') return state;
  a.state = 'active';
  addEvent(s, 'confirm-assignment', `确认引用：${depName(s, a.depId)} → 《${MATERIAL_CATALOG[kindOfMaterial(s, a.materialId)].name}》`, {depId: a.depId, materialId: a.materialId}, true);
  // 该变更事件下已无待确认提案 → 待办自动关闭
  const ev = s.events.find((e) => e.id === a.sinceEventId);
  if (ev && !ev.resolved && !s.assignments.some((x) => x.sinceEventId === ev.id && x.state === 'proposed')) {
    ev.resolved = true;
  }
  return s;
}

/** 清理失效引用（不影响其他材料）；若变更事件下提案已清空则关闭待办 */
export function removeAssignment(state: AppState, assignmentId: string): AppState {
  const s = clone(state);
  const a = s.assignments.find((x) => x.id === assignmentId);
  if (!a || a.state !== 'invalidated') return state;
  const eventId = a.invalidatedEventId;
  s.assignments = s.assignments.filter((x) => x.id !== assignmentId);
  addEvent(s, 'remove-assignment', `清除失效引用：${depName(s, a.depId)} 的${a.kind}指派`, {depId: a.depId}, true);
  if (eventId) {
    const ev = s.events.find((e) => e.id === eventId);
    if (ev && !ev.resolved && !s.assignments.some((x) => x.sinceEventId === ev.id && x.state === 'proposed')) ev.resolved = true;
  }
  return s;
}

export function resolveEvent(state: AppState, eventId: string): AppState {
  const s = clone(state);
  const ev = s.events.find((e) => e.id === eventId);
  if (ev) ev.resolved = true;
  return s;
}

function kindOfMaterial(state: AppState, materialId: string): MaterialKind {
  return state.materials.find((m) => m.id === materialId)?.kind ?? 'notice-bundled';
}

/* ---------------- 暂缓缺口判定 ---------------- */

export type GapType = 'owner' | 'proposed' | 'license-text' | 'change-note' | 'link' | 'artifact';

export interface Gap {
  type: GapType;
  assignmentId?: string;
  depId?: string;
  licenseId?: string;
  message: string;
}

export interface RefView {
  assignment: Assignment;
  dep?: Dep;
  sinceEvent?: ChangeEvent;
  invalidEvent?: ChangeEvent;
}

export interface MaterialView {
  material: Material;
  kind: MaterialKind;
  refs: RefView[];
  /** 当前生效引用（proposed/active），即材料实际要覆盖的义务 */
  liveRefs: RefView[];
  gaps: Gap[];
  status: 'ready' | 'held' | 'idle';
}

function hasLicenseText(state: AppState, licenseId: string) {
  return !!state.licenseTexts.find((t) => t.licenseId === licenseId && t.text.trim());
}

export function buildMaterialView(state: AppState, material: Material): MaterialView {
  const cat = MATERIAL_CATALOG[material.kind];
  const refs: RefView[] = state.assignments
    .filter((a) => a.materialId === material.id)
    .sort((a, b) => (a.state === 'invalidated' ? 1 : 0) - (b.state === 'invalidated' ? 1 : 0))
    .map((a) => ({
      assignment: a,
      dep: state.deps.find((d) => d.id === a.depId),
      sinceEvent: state.events.find((e) => e.id === a.sinceEventId),
      invalidEvent: state.events.find((e) => e.id === a.invalidatedEventId),
    }));
  const liveRefs = refs.filter((r) => r.assignment.state !== 'invalidated');
  const gaps: Gap[] = [];

  if (liveRefs.length && !material.owner) {
    gaps.push({type: 'owner', message: '无人认领：需要指定材料负责人'});
  }
  for (const r of liveRefs) {
    const a = r.assignment;
    if (a.state === 'proposed') {
      gaps.push({type: 'proposed', assignmentId: a.id, depId: a.depId, message: `${r.dep?.name ?? a.depId} 的引用待确认`});
      continue; // 待确认期间先不核查内容缺口
    }
    if (material.kind === 'notice-bundled' && r.dep && !hasLicenseText(state, r.dep.licenseId)) {
      gaps.push({type: 'license-text', assignmentId: a.id, depId: a.depId, licenseId: r.dep.licenseId, message: `缺许可证正文：${r.dep.name}（${r.dep.licenseId}）`});
    }
    if (material.kind === 'changes-bundled' && !state.changeNotes.find((n) => n.depId === a.depId && n.text.trim())) {
      gaps.push({type: 'change-note', assignmentId: a.id, depId: a.depId, message: `缺修改说明：${r.dep?.name ?? a.depId}`});
    }
    if (cat.nature === 'link' && !a.linkUrl?.trim()) {
      gaps.push({type: 'link', assignmentId: a.id, depId: a.depId, message: `缺外链地址：${r.dep?.name ?? a.depId}`});
    }
    if (material.kind === 'source-bundled' && !a.artifact?.trim()) {
      gaps.push({type: 'artifact', assignmentId: a.id, depId: a.depId, message: `缺随包源码位置：${r.dep?.name ?? a.depId}`});
    }
  }

  const activeCount = liveRefs.filter((r) => r.assignment.state === 'active').length;
  const status: MaterialView['status'] = liveRefs.length === 0 ? 'idle' : gaps.length ? 'held' : activeCount ? 'ready' : 'held';
  return {material, kind: material.kind, refs, liveRefs, gaps, status};
}

export function buildMaterialViews(state: AppState): MaterialView[] {
  const byId = new Map(state.materials.map((m) => [m.id, m]));
  return MATERIAL_ORDER.map((kind) => state.materials.find((m) => m.kind === kind))
    .filter((m): m is Material => !!m)
    .map((m) => buildMaterialView(state, byId.get(m.id)!));
}

/* ---------------- 待办 ---------------- */

export interface TodoView {
  event: ChangeEvent;
  pendingCount: number;
}

export function openTodos(state: AppState): TodoView[] {
  return state.events
    .filter((e) => !e.resolved)
    .map((ev) => ({event: ev, pendingCount: state.assignments.filter((a) => a.sinceEventId === ev.id && a.state === 'proposed').length}))
    .reverse();
}

export function recentEvents(state: AppState, limit = 30): ChangeEvent[] {
  return [...state.events].reverse().slice(0, limit);
}

/* ---------------- 材料正文合稿（同一义务跨依赖合一份） ---------------- */

export function compileMaterial(state: AppState, view: MaterialView): string {
  const cat = MATERIAL_CATALOG[view.kind];
  const active = view.liveRefs.filter((r) => r.assignment.state === 'active' && r.dep);
  const lines: string[] = [`# ${cat.name}`, '', cat.desc, ''];
  if (view.kind === 'notice-bundled') {
    for (const r of active) {
      const dep = r.dep!;
      const text = state.licenseTexts.find((t) => t.licenseId === dep.licenseId)?.text ?? '（许可证正文缺失，暂缓交付）';
      lines.push(`## ${dep.name} ${dep.version} — ${dep.licenseId}`, '', `Copyright 与许可声明归属 ${dep.name} 上游权利人。`, '', '```', text, '```', '');
    }
  } else if (view.kind === 'changes-bundled') {
    for (const r of active) {
      const dep = r.dep!;
      const note = state.changeNotes.find((n) => n.depId === dep.id)?.text ?? '（修改说明缺失，暂缓交付）';
      lines.push(`## ${dep.name} ${dep.version}（已修改）`, '', note, '');
    }
  } else if (view.kind === 'source-bundled') {
    lines.push('| 依赖 | 版本 | 包内源码位置 |', '|---|---|---|');
    for (const r of active) {
      const dep = r.dep!;
      lines.push(`| ${dep.name} | ${dep.version} | ${r.assignment.artifact?.trim() || '（未登记）'} |`);
    }
  } else {
    lines.push('| 依赖 | 版本 | 外链地址 |', '|---|---|---|');
    for (const r of active) {
      const dep = r.dep!;
      lines.push(`| ${dep.name} | ${dep.version} | ${r.assignment.linkUrl?.trim() || '（未登记）'} |`);
    }
  }
  lines.push(`<!-- 生成时间 ${new Date().toISOString()}；负责人：${view.material.owner || '未认领'}；生效引用 ${active.length} 条 -->`);
  return lines.join('\n');
}

/* ---------------- misc ---------------- */

function clone(state: AppState): AppState {
  return {
    version: 1,
    deps: state.deps.map((d) => ({...d})),
    materials: state.materials.map((m) => ({...m})),
    assignments: state.assignments.map((a) => ({...a})),
    modeOverrides: state.modeOverrides.map((o) => ({...o})),
    licenseTexts: state.licenseTexts.map((t) => ({...t})),
    changeNotes: state.changeNotes.map((n) => ({...n})),
    events: state.events.map((e) => ({...e})),
  };
}
