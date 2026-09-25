import {useEffect, useState} from 'react';
import {ArrowRight, FileText, PenLine, User} from 'lucide-react';
import type {Dependency, Material, Obligation} from '../domain/types';
import {FULFILLMENT_LABEL, KIND_LABEL} from '../domain/types';
import {citationsOf, isHolding, materialGaps, staleCitationsOf} from '../domain/obligations';
import {formatTime, Pill} from './ui';

interface Props {
  material: Material;
  obligations: Obligation[];
  deps: Dependency[];
  defaultEditing?: boolean;
  highlighted?: boolean;
  onSave: (patch: {body?: string; owner?: string}) => void;
  onOpenDep: (depId: string) => void;
}

export default function MaterialCard({material, obligations, deps, defaultEditing, highlighted, onSave, onOpenDep}: Props) {
  const [editing, setEditing] = useState(!!defaultEditing);
  const [body, setBody] = useState(material.body);
  const [owner, setOwner] = useState(material.owner);
  useEffect(() => {
    setBody(material.body);
    setOwner(material.owner);
  }, [material.body, material.owner]);

  const gaps = materialGaps(material);
  const holding = isHolding(material);
  const cites = citationsOf(material.id, obligations);
  const stale = staleCitationsOf(material.id, obligations);
  const depOf = (id: string) => deps.find(d => d.id === id);

  return (
    <div className={`mat-card${holding ? ' holding' : ''}${highlighted ? ' flash' : ''}`}>
      <div className="mat-head">
        <div className="mat-icon"><FileText size={16}/></div>
        <div className="mat-head-main">
          <h3>{material.title}</h3>
          <div className="mat-meta">
            <Pill tone="teal">{KIND_LABEL[material.kind]}</Pill>
            <Pill tone={material.fulfillment === 'bundled' ? 'blue' : 'purple'}>{FULFILLMENT_LABEL[material.fulfillment]}</Pill>
            {gaps.map(g => <span className="gap-chip" key={g}>{g}</span>)}
          </div>
        </div>
        <button className="btn ghost" onClick={() => setEditing(e => !e)}>
          <PenLine size={13}/>{editing ? '收起' : '编辑'}
        </button>
      </div>
      <div className="mat-owner">
        <User size={12}/>{material.owner || '未认领'}<span>·</span>更新于 {formatTime(material.updatedAt)}
      </div>
      {editing ? (
        <div className="mat-edit">
          <label>
            材料正文
            <textarea rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="粘贴许可证正文、NOTICE 内容或源码获取说明…"/>
          </label>
          <label>
            认领人
            <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="填写负责人，例如 Zen Li"/>
          </label>
          <button className="primary full" onClick={() => { onSave({body, owner}); setEditing(false); }}>保存材料</button>
          {holding && <p className="hint">补齐正文与认领人后，这份材料会自动回到清单。</p>}
        </div>
      ) : material.body ? (
        <pre className="mat-body">{material.body}</pre>
      ) : (
        <p className="mat-body-empty">正文缺失——补齐前材料停在暂缓区，引用它的义务暂不能交付。</p>
      )}
      <div className="cite-block">
        <div className="cite-title">引用（{cites.length + stale.length}）</div>
        {cites.map(o => {
          const d = depOf(o.depId);
          return (
            <button className="cite-item" key={o.id} onClick={() => onOpenDep(o.depId)}>
              <span className="cite-dot"/>{d?.name ?? o.depId}@{d?.version ?? '?'} · {KIND_LABEL[o.kind]}<ArrowRight size={11}/>
            </button>
          );
        })}
        {stale.map(o => {
          const d = depOf(o.depId);
          return (
            <button className="cite-item stale" key={o.id} onClick={() => onOpenDep(o.depId)}>
              <span className="cite-dot"/>{d?.name ?? o.depId}@{d?.version ?? '?'} · {KIND_LABEL[o.kind]}
              <span className="cite-tag">失效待重派</span><ArrowRight size={11}/>
            </button>
          );
        })}
        {cites.length + stale.length === 0 && <p className="hint">还没有义务引用这份材料。</p>}
      </div>
    </div>
  );
}
