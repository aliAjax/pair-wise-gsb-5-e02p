import {Inbox} from 'lucide-react';
import type {LensState} from '../domain/types';
import {isHolding} from '../domain/obligations';
import MaterialCard from '../components/MaterialCard';
import {Empty} from '../components/ui';

interface Props {
  state: LensState;
  highlightId: string | null;
  onOpenDep: (depId: string) => void;
  onSave: (materialId: string, patch: {body?: string; owner?: string}) => void;
}

export default function HoldingPage({state, highlightId, onOpenDep, onSave}: Props) {
  const holding = state.materials.filter(isHolding);
  return (
    <section className="pane">
      <div className="pane-head">
        <div>
          <h2>暂缓区</h2>
          <p>缺正文或缺认领人的材料停在这里，写明缺口，补齐后自动回到清单</p>
        </div>
      </div>
      {holding.length === 0 ? (
        <Empty icon={<Inbox size={26}/>} title="暂缓区为空" hint="所有材料都已补齐正文与认领人。"/>
      ) : (
        <div className="mat-list pad">
          {holding.map(m => (
            <MaterialCard
              key={m.id}
              material={m}
              obligations={state.obligations}
              deps={state.deps}
              defaultEditing
              highlighted={m.id === highlightId}
              onSave={patch => onSave(m.id, patch)}
              onOpenDep={onOpenDep}
            />
          ))}
        </div>
      )}
    </section>
  );
}
