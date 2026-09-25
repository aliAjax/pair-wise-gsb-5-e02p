// 页面层：交付清单（就绪材料）。缺口补齐后材料自动回到这里。
import {Link2, PackageCheck} from 'lucide-react';
import {MATERIAL_CATALOG} from '../../domain/catalog';
import {buildMaterialViews} from '../../domain/orchestrator';
import type {OrchestratorActions} from '../../store/useOrchestrator';
import type {AppState} from '../../domain/types';
import {StatusPill} from '../widgets';

export function ChecklistPage({
  state,
  actions,
  onOpen,
}: {
  state: AppState;
  actions: OrchestratorActions;
  onOpen: (materialId: string) => void;
}) {
  void actions;
  const views = buildMaterialViews(state);
  const ready = views.filter((v) => v.status === 'ready');
  const idle = views.filter((v) => v.status === 'idle');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>交付清单</h2>
          <p>义务已编排、正文齐备且有人认领的材料。缺口补齐后材料自动从暂缓区回到这里。</p>
        </div>
      </div>

      <div className="mat-grid">
        {ready.length === 0 && (
          <div className="empty-card">
            <PackageCheck size={22} />
            <b>暂无就绪材料</b>
            <span>所有材料仍在暂缓区，补齐缺口后会回到本清单。</span>
          </div>
        )}
        {ready.map((v) => {
          const cat = MATERIAL_CATALOG[v.kind];
          return (
            <button key={v.material.id} className="mat-card ready" onClick={() => onOpen(v.material.id)}>
              <div className="mat-card-top">
                <span className="mat-ic">{cat.nature === 'bundled' ? <PackageCheck size={17} /> : <Link2 size={17} />}</span>
                <StatusPill status="ready" />
              </div>
              <b>{cat.name}</b>
              <p>{cat.desc}</p>
              <div className="mat-meta">
                <span>{v.liveRefs.length} 条义务引用</span>
                <span>负责人：{v.material.owner}</span>
              </div>
            </button>
          );
        })}
      </div>

      {idle.length > 0 && (
        <>
          <h3 className="section-sub">暂无义务引用的材料</h3>
          <div className="mat-grid compact">
            {idle.map((v) => {
              const cat = MATERIAL_CATALOG[v.kind];
              return (
                <button key={v.material.id} className="mat-card idle" onClick={() => onOpen(v.material.id)}>
                  <div className="mat-card-top">
                    <span className="mat-ic">{cat.nature === 'bundled' ? <PackageCheck size={16} /> : <Link2 size={16} />}</span>
                    <StatusPill status="idle" />
                  </div>
                  <b>{cat.name}</b>
                  <div className="mat-meta">
                    <span>引用 0 条</span>
                    <span>{v.material.owner ? `负责人：${v.material.owner}` : '未认领'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
