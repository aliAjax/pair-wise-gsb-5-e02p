import {Check, History, Inbox, Plus, RotateCcw} from 'lucide-react';
import type {LensState} from '../domain/types';
import type {TodoItem} from '../domain/obligations';
import {Empty, formatTime, Pill, REASON_TONE} from '../components/ui';

interface Props {
  state: LensState;
  todos: TodoItem[];
  onAssign: (obligationId: string) => void;
  onGoHolding: (materialId: string) => void;
}

export default function TodosPage({state, todos, onAssign, onGoHolding}: Props) {
  return (
    <section className="todo-grid">
      <div className="pane">
        <div className="pane-head">
          <div>
            <h2>待办事项</h2>
            <p>失效重派、新义务指派与材料缺口 · {todos.length} 项</p>
          </div>
        </div>
        {todos.length === 0 ? (
          <Empty icon={<Check size={26}/>} title="没有待办" hint="所有义务都已指派，材料齐备。"/>
        ) : (
          todos.map(t => (
            <div className="todo-item" key={t.id}>
              <div className={`todo-ic ${t.kind}`}>
                {t.kind === 'reassign' ? <RotateCcw size={15}/> : t.kind === 'assign' ? <Plus size={15}/> : <Inbox size={15}/>}
              </div>
              <div className="todo-main">
                <b>{t.title}</b>
                <p>{t.detail}</p>
              </div>
              {t.kind === 'gap' ? (
                <button className="btn act" onClick={() => t.materialId && onGoHolding(t.materialId)}>去补齐</button>
              ) : (
                <button className="btn primary-sm act" onClick={() => t.obligationId && onAssign(t.obligationId)}>去指派</button>
              )}
            </div>
          ))
        )}
      </div>
      <div className="pane">
        <div className="pane-head">
          <div>
            <h2>变更记录</h2>
            <p>升级、换证与指派留痕，重开仍在</p>
          </div>
        </div>
        {state.events.length === 0 ? (
          <Empty icon={<History size={26}/>} title="还没有变更" hint="依赖升级、换证或指派调整都会记录在这里。"/>
        ) : (
          state.events.map(ev => (
            <div className="ev-item" key={ev.id}>
              <div className="ev-main">
                <div className="ev-head">
                  <Pill tone={REASON_TONE[ev.reason] ?? 'grey'}>{ev.reason}</Pill>
                  {ev.depName && <b>{ev.depName}</b>}
                </div>
                <p>{ev.detail}</p>
              </div>
              <span className="ev-time">{formatTime(ev.at)}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
