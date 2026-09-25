import {useState} from 'react';
import type {Dependency, Material, Obligation} from '../domain/types';
import {FULFILLMENT_LABEL, KIND_LABEL} from '../domain/types';
import {citationsOf, materialGaps} from '../domain/obligations';
import {Modal} from './ui';

interface Props {
  obligation: Obligation;
  dep?: Dependency;
  materials: Material[];
  obligations: Obligation[];
  onClose: () => void;
  onAssign: (materialId: string) => void;
  onAssignNew: (title: string) => void;
}

export default function AssignModal({obligation, dep, materials, obligations, onClose, onAssign, onAssignNew}: Props) {
  const compatible = materials.filter(m => m.kind === obligation.kind && m.fulfillment === obligation.fulfillment);
  const [sel, setSel] = useState<string>(() =>
    obligation.materialId && compatible.some(m => m.id === obligation.materialId)
      ? obligation.materialId
      : compatible[0]?.id ?? 'new',
  );
  const [title, setTitle] = useState('');

  return (
    <Modal title={`指派材料 · ${dep?.name ?? ''} · ${KIND_LABEL[obligation.kind]}`} onClose={onClose}>
      <p className="hint">
        交付方式：{FULFILLMENT_LABEL[obligation.fulfillment]}。同一义务的材料可跨依赖复用，选择已有材料即合并引用；新建材料会先进暂缓区，补齐正文与认领人后回到清单。
      </p>
      <div className="radio-list">
        {compatible.map(m => {
          const refs = citationsOf(m.id, obligations).length;
          const gaps = materialGaps(m);
          return (
            <button key={m.id} className={sel === m.id ? 'mat-option sel' : 'mat-option'} onClick={() => setSel(m.id)}>
              <span className="radio"/>
              <span className="mo-body">
                <b>
                  {m.title}
                  {gaps.length > 0 && <span className="gap-chip">{gaps.join(' · ')}</span>}
                </b>
                <small>认领人：{m.owner || '未认领'} · 已被 {refs} 项义务引用</small>
              </span>
            </button>
          );
        })}
        <button className={sel === 'new' ? 'mat-option sel' : 'mat-option'} onClick={() => setSel('new')}>
          <span className="radio"/>
          <span className="mo-body">
            <b>新建材料</b>
            <small>同类的{KIND_LABEL[obligation.kind]}（{FULFILLMENT_LABEL[obligation.fulfillment]}）义务可继续合并进来</small>
          </span>
        </button>
      </div>
      {sel === 'new' && (
        <label>
          材料标题
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder={`例如「${KIND_LABEL[obligation.kind]}材料（${FULFILLMENT_LABEL[obligation.fulfillment]}）」`}/>
        </label>
      )}
      <button className="primary full" onClick={() => (sel === 'new' ? onAssignNew(title) : onAssign(sel))}>确认指派</button>
    </Modal>
  );
}
