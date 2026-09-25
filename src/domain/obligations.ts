import type {LensState, Material, Obligation} from './types';
import {FULFILLMENT_LABEL, KIND_LABEL} from './types';

export function materialGaps(m: Material): string[] {
  const gaps: string[] = [];
  if (!m.body.trim()) gaps.push('缺正文');
  if (!m.owner.trim()) gaps.push('缺认领人');
  return gaps;
}

export const isHolding = (m: Material): boolean => materialGaps(m).length > 0;

export function citationsOf(materialId: string, obligations: Obligation[]): Obligation[] {
  return obligations.filter(o => o.materialId === materialId && o.state === 'assigned');
}

export function staleCitationsOf(materialId: string, obligations: Obligation[]): Obligation[] {
  return obligations.filter(o => o.materialId === materialId && o.state === 'invalidated');
}

export type DepReadiness = 'ready' | 'blocked' | 'todo';

export const READINESS_LABEL: Record<DepReadiness, string> = {
  ready: '已就绪',
  blocked: '暂缓中',
  todo: '待处理',
};

export function depReadiness(depId: string, obligations: Obligation[], materials: Material[]): DepReadiness {
  const obs = obligations.filter(o => o.depId === depId);
  if (obs.length === 0 || obs.some(o => o.state !== 'assigned')) return 'todo';
  const holdingIds = new Set(materials.filter(isHolding).map(m => m.id));
  return obs.some(o => o.materialId && holdingIds.has(o.materialId)) ? 'blocked' : 'ready';
}

export interface TodoItem {
  id: string;
  kind: 'reassign' | 'assign' | 'gap';
  title: string;
  detail: string;
  obligationId?: string;
  materialId?: string;
  depId?: string;
}

export function todosOf(state: LensState): TodoItem[] {
  const items: TodoItem[] = [];
  for (const o of state.obligations) {
    if (o.state === 'assigned') continue;
    const dep = state.deps.find(d => d.id === o.depId);
    const name = dep?.name ?? o.depId;
    items.push(
      o.state === 'invalidated'
        ? {
            id: `todo-${o.id}`, kind: 'reassign', obligationId: o.id, depId: o.depId,
            title: `${name} · ${KIND_LABEL[o.kind]}需重新指派`,
            detail: o.note || '原指派已失效，材料保留可沿用',
          }
        : {
            id: `todo-${o.id}`, kind: 'assign', obligationId: o.id, depId: o.depId,
            title: `${name} · ${KIND_LABEL[o.kind]}待指派`,
            detail: `交付方式：${FULFILLMENT_LABEL[o.fulfillment]}，选择已有材料合并或新建一份`,
          },
    );
  }
  for (const m of state.materials.filter(isHolding)) {
    const refs = citationsOf(m.id, state.obligations).length;
    items.push({
      id: `todo-m-${m.id}`, kind: 'gap', materialId: m.id,
      title: `材料「${m.title}」停在暂缓区`,
      detail: `缺口：${materialGaps(m).join('、')} · 被 ${refs} 项义务引用`,
    });
  }
  return items;
}

export function buildMaterialsMarkdown(state: LensState): string {
  const lines: string[] = ['# 开源交付义务材料清单', ''];
  for (const m of state.materials) {
    const gaps = materialGaps(m);
    lines.push(`## ${m.title}（${KIND_LABEL[m.kind]} · ${FULFILLMENT_LABEL[m.fulfillment]}）`, '');
    lines.push(`- 认领人：${m.owner || '未认领'}`);
    lines.push(`- 状态：${gaps.length ? `暂缓（${gaps.join('、')}）` : '已就绪'}`, '', '```', m.body || '（正文缺失）', '```', '', '引用：');
    const cites = citationsOf(m.id, state.obligations);
    if (cites.length === 0) lines.push('- （暂无）');
    for (const c of cites) {
      const d = state.deps.find(dd => dd.id === c.depId);
      lines.push(`- ${d?.name ?? c.depId}@${d?.version ?? '?'} · ${KIND_LABEL[c.kind]}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
