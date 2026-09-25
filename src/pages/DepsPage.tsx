import {useMemo, useState} from 'react';
import {AlertTriangle, ArrowUpCircle, Check, FileCode2, Search, X} from 'lucide-react';
import type {Dependency, Fulfillment, LensState, ObligationKind} from '../domain/types';
import {FULFILLMENT_LABEL, KIND_LABEL, OBLIGATION_STATE_LABEL} from '../domain/types';
import {depReadiness, isHolding, READINESS_LABEL} from '../domain/obligations';
import type {DepReadiness} from '../domain/obligations';
import {LICENSE_COLORS} from '../data/licenses';
import {formatTime, Pill, REASON_TONE} from '../components/ui';

const KIND_ORDER: Record<ObligationKind, number> = {attribution: 0, source: 1, modification: 2};
const READINESS_TONE: Record<DepReadiness, string> = {ready: 'teal', blocked: 'orange', todo: 'red'};

interface Props {
  state: LensState;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAssign: (obligationId: string) => void;
  onUpdateDep: (dep: Dependency) => void;
  onOpenMaterial: (materialId: string) => void;
  onFulfillment: (obligationId: string, f: Fulfillment) => void;
}

export default function DepsPage({state, selectedId, onSelect, onAssign, onUpdateDep, onOpenMaterial, onFulfillment}: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('全部');

  const rows = useMemo(
    () =>
      state.deps
        .map(dep => ({dep, readiness: depReadiness(dep.id, state.obligations, state.materials)}))
        .filter(r => (filter === '全部' || r.readiness === filter) && `${r.dep.name}${r.dep.license}`.toLowerCase().includes(query.toLowerCase())),
    [state.deps, state.obligations, state.materials, filter, query],
  );

  const current = state.deps.find(d => d.id === selectedId) ?? null;
  const currentObs = current
    ? state.obligations.filter(o => o.depId === current.id).sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
    : [];
  const depEvents = current ? state.events.filter(e => e.depId === current.id).slice(0, 3) : [];

  return (
    <section className="workspace">
      <div className="table-pane">
        <div className="pane-head">
          <div>
            <h2>依赖清单</h2>
            <p>每个依赖的署名、源码交付与修改披露按随包 / 外链列出</p>
          </div>
          <div className="tools">
            <div className="search">
              <Search size={15}/>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索依赖"/>
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="全部">全部状态</option>
              <option value="ready">已就绪</option>
              <option value="blocked">暂缓中</option>
              <option value="todo">待处理</option>
            </select>
          </div>
        </div>
        <div className="table">
          <div className="tr th dep-tr">
            <span>依赖名称</span><span>版本</span><span>许可证</span><span>义务</span><span>状态</span>
          </div>
          {rows.map(({dep, readiness}) => {
            const obs = state.obligations.filter(o => o.depId === dep.id);
            const done = obs.filter(o => o.state === 'assigned').length;
            const color = LICENSE_COLORS[dep.license] || '#888';
            return (
              <button className={dep.id === selectedId ? 'tr dep-tr selected' : 'tr dep-tr'} key={dep.id} onClick={() => onSelect(dep.id)}>
                <span className="dep-name"><span className="pkg-dot"/> {dep.name}</span>
                <span className="muted">{dep.version}</span>
                <span><i className="license" style={{color, background: color + '18'}}>{dep.license}</i></span>
                <span className="ob-dots">
                  {obs.map(o => <span key={o.id} className={`ob-dot ${o.state}`} title={`${KIND_LABEL[o.kind]} · ${OBLIGATION_STATE_LABEL[o.state]}`}/>)}
                  <span className="ob-count">{done}/{obs.length}</span>
                </span>
                <span><Pill tone={READINESS_TONE[readiness]}>{READINESS_LABEL[readiness]}</Pill></span>
              </button>
            );
          })}
        </div>
      </div>

      {current ? (
        <div className="detail">
          <div className="detail-head">
            <div className="detail-icon" style={{background: (LICENSE_COLORS[current.license] || '#888') + '1c', color: LICENSE_COLORS[current.license]}}>
              <FileCode2 size={20}/>
            </div>
            <div>
              <span>SELECTED DEPENDENCY</span>
              <h2>{current.name}</h2>
            </div>
            <button className="close" onClick={() => onSelect(null)}><X size={16}/></button>
          </div>
          <div className="detail-grid">
            <div><label>版本</label><b>{current.version}</b></div>
            <div><label>来源</label><b>{current.source}</b></div>
            <div><label>许可证</label><b>{current.license}</b></div>
          </div>
          <div className="detail-actions">
            <button className="btn" onClick={() => onUpdateDep(current)}><ArrowUpCircle size={14}/>升级 / 换证</button>
          </div>
          <div className="ob-list">
            {currentObs.map(o => {
              const material = o.materialId ? state.materials.find(m => m.id === o.materialId) : undefined;
              return (
                <div className={`ob-row ${o.state}`} key={o.id}>
                  <div className="ob-main">
                    <div className="ob-title">
                      <b>{KIND_LABEL[o.kind]}</b>
                      <Pill tone={o.fulfillment === 'bundled' ? 'blue' : 'purple'}>{FULFILLMENT_LABEL[o.fulfillment]}</Pill>
                      <span className={`ob-state ${o.state}`}>{OBLIGATION_STATE_LABEL[o.state]}</span>
                    </div>
                    {o.state === 'assigned' && material && (
                      <button className="ob-material" onClick={() => onOpenMaterial(material.id)}>
                        → 「{material.title}」{isHolding(material) && <em>暂缓区</em>}
                      </button>
                    )}
                    {o.state !== 'assigned' && <p className="ob-note">{o.note}</p>}
                  </div>
                  <div className="ob-actions">
                    <select value={o.fulfillment} onChange={e => onFulfillment(o.id, e.target.value as Fulfillment)}>
                      <option value="bundled">随包</option>
                      <option value="link">外链</option>
                    </select>
                    {o.state === 'assigned' ? (
                      <button className="btn ghost" onClick={() => onAssign(o.id)}>更换材料</button>
                    ) : (
                      <button className="btn primary-sm" onClick={() => onAssign(o.id)}>
                        {o.state === 'invalidated' ? '重新指派' : '指派材料'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {depEvents.length > 0 && (
            <div className="dep-events">
              <div className="cite-title">最近变更</div>
              {depEvents.map(ev => (
                <div className="dep-ev" key={ev.id}>
                  <Pill tone={REASON_TONE[ev.reason] ?? 'grey'}>{ev.reason}</Pill>
                  <span>{ev.detail}</span>
                  <em>{formatTime(ev.at)}</em>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="detail detail-empty">
          <Check size={22}/>
          <b>选择左侧依赖</b>
          <p>逐项查看义务去向：随包还是外链、附在哪份材料上。</p>
        </div>
      )}
    </section>
  );
}
