// 页面层：暂缓区。缺正文 / 缺修改说明 / 缺外链或源码位置 / 无人认领 / 引用待确认，都停在这里并写明缺口。
import {AlertTriangle, Link2, PackageCheck} from 'lucide-react';
import {MATERIAL_CATALOG, OBLIGATION_LABELS} from '../../domain/catalog';
import {buildMaterialViews} from '../../domain/orchestrator';
import type {OrchestratorActions} from '../../store/useOrchestrator';
import type {AppState} from '../../domain/types';
import {StatusPill} from '../widgets';

const GAP_TAG: Record<string, string> = {
  owner: '无人认领',
  proposed: '引用待确认',
  'license-text': '缺许可证正文',
  'change-note': '缺修改说明',
  link: '缺外链地址',
  artifact: '缺源码位置',
};

export function HoldingPage({
  state,
  actions,
  onOpen,
}: {
  state: AppState;
  actions: OrchestratorActions;
  onOpen: (materialId: string) => void;
}) {
  void actions;
  const views = buildMaterialViews(state).filter((v) => v.status === 'held');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>暂缓区</h2>
          <p>材料未达到可交付标准时停在这里，逐项写明缺口；全部补齐后自动回到交付清单。</p>
        </div>
        <span className="held-count">
          <AlertTriangle size={15} /> {views.length} 份暂缓
        </span>
      </div>

      {views.length === 0 ? (
        <div className="empty-card wide">
          <PackageCheck size={22} />
          <b>暂缓区已清空</b>
          <span>所有材料均已就绪，可前往交付清单核对并下载。</span>
        </div>
      ) : (
        <div className="holding-list">
          {views.map((v) => {
            const cat = MATERIAL_CATALOG[v.kind];
            const gapTypes = [...new Set(v.gaps.map((g) => g.type))];
            return (
              <button key={v.material.id} className="hold-card" onClick={() => onOpen(v.material.id)}>
                <div className="hold-main">
                  <span className="mat-ic warn">{cat.nature === 'bundled' ? <PackageCheck size={17} /> : <Link2 size={17} />}</span>
                  <div>
                    <div className="hold-title">
                      <b>{cat.name}</b>
                      <StatusPill status="held" />
                    </div>
                    <small>义务：{OBLIGATION_LABELS[cat.obligation]} · {v.liveRefs.length} 条生效引用 · {v.material.owner ? `负责人 ${v.material.owner}` : '未认领'}</small>
                    <div className="gap-tags">
                      {gapTypes.map((t) => (
                        <span key={t} className="gap-tag">
                          {GAP_TAG[t]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="hold-detail">
                  {v.gaps.slice(0, 4).map((g, i) => (
                    <span key={i} className="gap-line">· {g.message}</span>
                  ))}
                  {v.gaps.length > 4 && <span className="gap-line">· 另有 {v.gaps.length - 4} 项缺口…</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
