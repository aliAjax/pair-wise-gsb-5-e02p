// 页面层：材料详情（清单与暂缓区共用）。
// 展示义务→材料的逐条引用、失效留痕、合稿正文，并把缺口补齐动作收在一处。
import {useMemo, useState} from 'react';
import {ArrowLeft, FileText, Link2, PackageCheck, ShieldCheck, UserCheck} from 'lucide-react';
import {MATERIAL_CATALOG, MODE_LABELS, OBLIGATION_LABELS} from '../domain/catalog';
import {compileMaterial, type Gap, type MaterialView} from '../domain/orchestrator';
import type {AppState} from '../domain/types';
import type {OrchestratorActions} from '../store/useOrchestrator';
import {fmtTime, StatusPill} from './widgets';

export function MaterialSheet({
  state,
  view,
  actions,
  onBack,
}: {
  state: AppState;
  view: MaterialView;
  actions: OrchestratorActions;
  onBack: () => void;
}) {
  const cat = MATERIAL_CATALOG[view.kind];
  const [owner, setOwner] = useState('');
  const [textDraft, setTextDraft] = useState<Record<string, string>>({});
  const [noteDraft, setNoteDraft] = useState('');
  const [urlDraft, setUrlDraft] = useState<Record<string, string>>({});
  const [artifactDraft, setArtifactDraft] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  const compiled = useMemo(() => compileMaterial(state, view), [state, view]);
  const missingLicenses = useMemo(
    () => [...new Set(view.gaps.filter((g) => g.type === 'license-text').map((g) => g.licenseId!))],
    [view],
  );
  const noteGapDep = view.gaps.find((g) => g.type === 'change-note')?.depId;

  const download = () => {
    const blob = new Blob([compiled], {type: 'text/markdown'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${view.kind}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="sheet">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={14} /> 返回列表
      </button>
      <div className="sheet-head">
        <div className="sheet-icon">
          {cat.nature === 'bundled' ? <PackageCheck size={19} /> : <Link2 size={19} />}
        </div>
        <div>
          <small>MATERIAL · {cat.nature === 'bundled' ? '随包材料' : '外链材料'}</small>
          <h2>{cat.name}</h2>
          <p>{cat.desc}</p>
        </div>
        <div className="sheet-head-right">
          <StatusPill status={view.status} />
          <span className="owner-line">
            <UserCheck size={13} /> {view.material.owner || '未认领'}
          </span>
        </div>
      </div>

      <div className="sheet-section">
        <h3>义务引用（{view.liveRefs.length} 条生效{view.refs.length - view.liveRefs.length ? ` · ${view.refs.length - view.liveRefs.length} 条失效留痕` : ''}）</h3>
        <p className="hint">同一义务跨依赖合并到本材料；每条引用可追到依赖、交付方式与产生依据。</p>
        <div className="ref-list">
          {view.refs.length === 0 && <div className="empty-line">当前没有任何依赖义务编排进这份材料。</div>}
          {view.refs.map((r) => {
            const a = r.assignment;
            return (
              <div key={a.id} className={`ref-row ${a.state}`}>
                <div className="ref-main">
                  <b>{r.dep ? `${r.dep.name}@${r.dep.version}` : a.depId}</b>
                  <span className="ref-tags">
                    <i>{OBLIGATION_LABELS[a.kind]}</i>
                    <i className="mode">{MODE_LABELS[a.mode]}</i>
                    {r.dep && <em>{r.dep.licenseId}</em>}
                  </span>
                  {a.state !== 'invalidated' && a.kind !== 'notice' && (
                    <ModeSwitch state={state} view={view} depId={a.depId} kind={a.kind} actions={actions} />
                  )}
                </div>
                <div className="ref-side">
                  <span className={`ref-state ${a.state}`}>
                    {a.state === 'active' ? '已确认' : a.state === 'proposed' ? '待确认' : '已失效'}
                  </span>
                  {a.state === 'proposed' && (
                    <button className="mini primary" onClick={() => actions.confirm(a.id)}>
                      确认编排
                    </button>
                  )}
                  {a.state === 'invalidated' && (
                    <button className="mini ghost" onClick={() => actions.remove(a.id)}>
                      清除记录
                    </button>
                  )}
                  {(cat.nature === 'link') && a.state === 'active' && (
                    <input
                      className="inline-input"
                      placeholder="登记外链 URL"
                      defaultValue={a.linkUrl ?? ''}
                      onChange={(e) => setUrlDraft((d) => ({...d, [a.id]: e.target.value}))}
                      onBlur={() => urlDraft[a.id] !== undefined && actions.setLink(a.id, urlDraft[a.id])}
                    />
                  )}
                  {view.kind === 'source-bundled' && a.state === 'active' && (
                    <input
                      className="inline-input"
                      placeholder="包内源码位置，如 vendor/legacy-parser-2.1.tar.gz"
                      defaultValue={a.artifact ?? ''}
                      onChange={(e) => setArtifactDraft((d) => ({...d, [a.id]: e.target.value}))}
                      onBlur={() => artifactDraft[a.id] !== undefined && actions.setArtifact(a.id, artifactDraft[a.id])}
                    />
                  )}
                </div>
                <div className="ref-trace">
                  产生：{r.sinceEvent ? `${fmtTime(r.sinceEvent.at)} · ${r.sinceEvent.message}` : '初始编排'}
                  {a.state === 'invalidated' && r.invalidEvent && (
                    <>
                      {' '}
                      · 失效：{fmtTime(r.invalidEvent.at)} · {r.invalidEvent.message}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {view.gaps.length > 0 && (
        <div className="sheet-section gaps">
          <h3>暂缓缺口（{view.gaps.length}）</h3>
          <div className="gap-items">
            {view.gaps.map((g, i) => (
              <GapAction
                key={`${g.type}-${g.assignmentId ?? g.licenseId ?? i}`}
                gap={g}
                materialId={view.material.id}
                actions={actions}
                owner={owner}
                setOwner={setOwner}
              />
            ))}
          </div>
          {missingLicenses.length > 0 && (
            <div className="bulk-text">
              {missingLicenses.map((lid) => (
                <div key={lid} className="text-editor">
                  <label>补录许可证正文 · {lid}</label>
                  <textarea
                    rows={5}
                    placeholder={`粘贴 ${lid} 全文（法务核对后保存）`}
                    value={textDraft[lid] ?? ''}
                    onChange={(e) => setTextDraft((d) => ({...d, [lid]: e.target.value}))}
                  />
                  <button
                    className="mini primary"
                    disabled={!(textDraft[lid] ?? '').trim()}
                    onClick={() => actions.fillText(lid, textDraft[lid]!)}
                  >
                    保存正文
                  </button>
                </div>
              ))}
            </div>
          )}
          {noteGapDep && (
            <div className="text-editor">
              <label>补录修改说明 · {state.deps.find((d) => d.id === noteGapDep)?.name}</label>
              <textarea
                rows={4}
                placeholder="说明对该依赖源码做了哪些修改"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <button className="mini primary" disabled={!noteDraft.trim()} onClick={() => actions.fillNote(noteGapDep, noteDraft)}>
                保存修改说明
              </button>
            </div>
          )}
        </div>
      )}

      <div className="sheet-section">
        <div className="preview-head">
          <h3>
            <FileText size={14} /> 合稿正文预览
          </h3>
          <div>
            <button className="mini ghost" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? '收起' : '展开'}
            </button>
            <button className="mini primary" disabled={view.status !== 'ready'} onClick={download}>
              下载材料
            </button>
          </div>
        </div>
        {view.status !== 'ready' && <p className="hint">补齐全部缺口后材料回到就绪清单，方可下载交付。</p>}
        {showPreview && <pre className="compile-preview">{compiled}</pre>}
      </div>
    </div>
  );
}

function ModeSwitch({
  state,
  view,
  depId,
  kind,
  actions,
}: {
  state: AppState;
  view: MaterialView;
  depId: string;
  kind: 'source' | 'changes';
  actions: OrchestratorActions;
}) {
  const dep = state.deps.find((d) => d.id === depId);
  if (!dep) return null;
  const live = view.liveRefs.find((r) => r.assignment.depId === depId && r.assignment.kind === kind);
  if (!live || live.assignment.state !== 'active') return null;
  const mode = live.assignment.mode;
  const label = kind === 'source' ? '源码交付' : '修改披露';
  return (
    <span className="mode-switch">
      {label}：
      <button className={mode === 'bundled' ? 'mini on' : 'mini ghost'} onClick={() => actions.setMode(depId, kind, 'bundled')}>
        随包
      </button>
      <button className={mode === 'link' ? 'mini on' : 'mini ghost'} onClick={() => actions.setMode(depId, kind, 'link')}>
        外链
      </button>
    </span>
  );
}

function GapAction({
  gap,
  materialId,
  actions,
  owner,
  setOwner,
}: {
  gap: Gap;
  materialId: string;
  actions: OrchestratorActions;
  owner: string;
  setOwner: (v: string) => void;
}) {
  const icon = {
    owner: <UserCheck size={14} />,
    proposed: <ShieldCheck size={14} />,
    'license-text': <FileText size={14} />,
    'change-note': <FileText size={14} />,
    link: <Link2 size={14} />,
    artifact: <PackageCheck size={14} />,
  }[gap.type];

  let action: React.ReactNode = null;
  if (gap.type === 'owner') {
    action = (
      <span className="gap-action">
        <input className="inline-input" placeholder="负责人姓名" value={owner} onChange={(e) => setOwner(e.target.value)} />
        <button className="mini primary" disabled={!owner.trim()} onClick={() => actions.claim(materialId, owner)}>
          认领
        </button>
      </span>
    );
  } else if (gap.type === 'proposed') {
    action = (
      <button className="mini primary" onClick={() => gap.assignmentId && actions.confirm(gap.assignmentId)}>
        确认引用
      </button>
    );
  } else if (gap.type === 'license-text') {
    action = <span className="hint-inline">在下方粘贴 {gap.licenseId} 全文</span>;
  } else if (gap.type === 'change-note') {
    action = <span className="hint-inline">在下方填写修改说明</span>;
  } else if (gap.type === 'link' || gap.type === 'artifact') {
    action = <span className="hint-inline">在上方引用行直接登记{gap.type === 'link' ? '外链 URL' : '包内位置'}</span>;
  }

  return (
    <div className="gap-row">
      <span className="gap-icon">{icon}</span>
      <span className="gap-msg">{gap.message}</span>
      <span className="gap-action-slot">{action}</span>
    </div>
  );
}
