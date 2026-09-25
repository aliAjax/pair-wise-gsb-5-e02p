// 页面层：依赖与义务。按依赖列出署名 / 源码交付 / 修改披露及其随包或外链归属。
import {useEffect, useMemo, useState} from 'react';
import {ArrowUpCircle, FileEdit, GitBranch, Plus, Search} from 'lucide-react';
import {
  LICENSE_COLORS,
  LICENSE_IDS,
  LICENSES,
  MATERIAL_CATALOG,
  MODE_LABELS,
  OBLIGATION_LABELS,
} from '../../domain/catalog';
import {obligationsOf} from '../../domain/orchestrator';
import type {AppState, ObligationKind} from '../../domain/types';
import type {OrchestratorActions} from '../../store/useOrchestrator';
import {Modal} from '../widgets';

export function DependenciesPage({
  state,
  actions,
  focusDepId,
}: {
  state: AppState;
  actions: OrchestratorActions;
  focusDepId?: string;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | undefined>(focusDepId ?? state.deps[0]?.id);
  const [showAdd, setShowAdd] = useState(false);
  const [versionDraft, setVersionDraft] = useState('');

  useEffect(() => {
    if (focusDepId && state.deps.some((d) => d.id === focusDepId)) setSelected(focusDepId);
  }, [focusDepId, state.deps]);

  const filtered = state.deps.filter((d) => `${d.name}${d.licenseId}`.toLowerCase().includes(query.toLowerCase()));
  const dep = state.deps.find((d) => d.id === selected) ?? filtered[0];
  const expected = useMemo(() => (dep ? obligationsOf(state, dep) : []), [state, dep]);

  const assignmentsFor = (kind: ObligationKind) =>
    dep ? state.assignments.filter((a) => a.depId === dep.id && a.kind === kind) : [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>依赖与义务</h2>
          <p>每个依赖按许可证列出署名、源码交付、修改披露，标注随包或外链，并指向编排材料。</p>
        </div>
        <button className="primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> 添加依赖
        </button>
      </div>

      <div className="dep-workspace">
        <div className="table-pane">
          <div className="pane-head">
            <div className="search">
              <Search size={14} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索依赖" />
            </div>
          </div>
          <div className="table">
            <div className="tr th">
              <span>依赖名称</span>
              <span>版本</span>
              <span>许可证</span>
              <span>义务</span>
            </div>
            {filtered.map((d) => {
              const obs = obligationsOf(state, d);
              return (
                <button key={d.id} className={dep?.id === d.id ? 'tr selected' : 'tr'} onClick={() => setSelected(d.id)}>
                  <span className="dep-name">
                    <span className="pkg-dot" /> {d.name}
                    {d.modified && <i className="mod-flag" title="已修改">改</i>}
                  </span>
                  <span className="muted">{d.version}</span>
                  <span>
                    <i className="license" style={{color: LICENSE_COLORS[d.licenseId], background: (LICENSE_COLORS[d.licenseId] || '#888') + '18'}}>
                      {d.licenseId}
                    </i>
                  </span>
                  <span className="muted small">{obs.map((o) => OBLIGATION_LABELS[o.kind].split(' ')[0]).join('、') || '—'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {dep && (
          <div className="detail dep-detail">
            <div className="detail-head">
              <div className="detail-icon" style={{background: (LICENSE_COLORS[dep.licenseId] || '#888') + '1c', color: LICENSE_COLORS[dep.licenseId]}}>
                <GitBranch size={18} />
              </div>
              <div>
                <span>DEPENDENCY · {dep.source}</span>
                <h2>{dep.name}</h2>
              </div>
            </div>

            <div className="detail-grid">
              <div>
                <label>版本</label>
                <b>{dep.version}</b>
              </div>
              <div>
                <label>许可证</label>
                <b>{dep.licenseId}</b>
              </div>
              <div>
                <label>已修改源码</label>
                <b>{dep.modified ? '是' : '否'}</b>
              </div>
            </div>

            <div className="dep-actions">
              <div className="inline-edit">
                <input placeholder="新版本号，如 2.2.0" value={versionDraft} onChange={(e) => setVersionDraft(e.target.value)} />
                <button
                  className="mini primary"
                  disabled={!versionDraft.trim() || versionDraft.trim() === dep.version}
                  onClick={() => {
                    actions.upgradeDep(dep.id, versionDraft);
                    setVersionDraft('');
                  }}
                >
                  <ArrowUpCircle size={13} /> 升级
                </button>
              </div>
              <label className="select-wrap">
                更换许可证
                <select value={dep.licenseId} onChange={(e) => actions.changeLicense(dep.id, e.target.value)}>
                  {LICENSE_IDS.map((id) => (
                    <option key={id}>{id}</option>
                  ))}
                </select>
              </label>
              <button className="mini ghost" onClick={() => actions.setModified(dep.id, !dep.modified)}>
                <FileEdit size={13} /> {dep.modified ? '取消已修改标记' : '标记为已修改'}
              </button>
            </div>
            <p className="hint warn-hint">
              升级、换照或修改标记只让该依赖的原指派失效并产生待确认引用，其它依赖与材料沿用不变。
            </p>

            <div className="obligation-list">
              <h4>义务编排</h4>
              {expected.length === 0 && <div className="empty-line">该许可证未登记分发义务。</div>}
              {expected.map((o) => {
                const refs = assignmentsFor(o.kind);
                return (
                  <div key={o.kind} className="ob-row">
                    <div className="ob-head">
                      <b>{OBLIGATION_LABELS[o.kind]}</b>
                      <span className="mode-chip">{MODE_LABELS[o.mode]}</span>
                    </div>
                    <div className="ob-route">→ {MATERIAL_CATALOG[kindToMaterial(o.kind, o.mode)].name}</div>
                    <div className="ob-refs">
                      {refs.length === 0 && <span className="hint-inline">无引用记录</span>}
                      {refs.map((a) => (
                        <span key={a.id} className={`ref-chip ${a.state}`}>
                          {a.state === 'active' ? '生效' : a.state === 'proposed' ? '待确认' : '已失效'}
                          {a.invalidDetail ? `（${a.invalidDetail}）` : ''}
                        </span>
                      ))}
                    </div>
                    {o.kind !== 'notice' && (
                      <div className="ob-mode-toggle">
                        <button className={o.mode === 'bundled' ? 'mini on' : 'mini ghost'} onClick={() => actions.setMode(dep.id, o.kind, 'bundled')}>
                          随包
                        </button>
                        <button className={o.mode === 'link' ? 'mini on' : 'mini ghost'} onClick={() => actions.setMode(dep.id, o.kind, 'link')}>
                          外链
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {!LICENSES[dep.licenseId] && <p className="hint">未登记的许可证规则，请先在资料层补充。</p>}
            </div>

            <p className="dep-note">{dep.note}</p>
          </div>
        )}
      </div>

      {showAdd && <AddDepModal onClose={() => setShowAdd(false)} onAdd={(i) => {actions.addDep(i); setShowAdd(false);}} />}
    </div>
  );
}

function kindToMaterial(kind: ObligationKind, mode: 'bundled' | 'link') {
  if (kind === 'notice') return 'notice-bundled' as const;
  if (kind === 'source') return mode === 'bundled' ? ('source-bundled' as const) : ('source-link' as const);
  return mode === 'bundled' ? ('changes-bundled' as const) : ('changes-link' as const);
}

function AddDepModal({onClose, onAdd}: {onClose: () => void; onAdd: (i: {name: string; licenseId: string}) => void}) {
  const [name, setName] = useState('');
  const [licenseId, setLicenseId] = useState('MIT');
  return (
    <Modal title="添加依赖" onClose={onClose} footer={
      <button className="primary full" disabled={!name.trim()} onClick={() => onAdd({name, licenseId})}>
        加入编排
      </button>
    }>
      <label className="field">
        依赖名称
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="例如 date-fns" />
      </label>
      <label className="field">
        许可证
        <select value={licenseId} onChange={(e) => setLicenseId(e.target.value)}>
          {LICENSE_IDS.map((id) => (
            <option key={id}>{id}</option>
          ))}
        </select>
      </label>
      <p className="hint">加入后按许可证规则生成义务引用（待确认），材料缺正文或无人认领会进入暂缓区。</p>
    </Modal>
  );
}
