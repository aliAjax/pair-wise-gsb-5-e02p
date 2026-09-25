// 页面层：待办与变更原因。事件只追加，重开仍可见；显示失效原因与待确认引用。
import {CheckCircle2, History, ListTodo} from 'lucide-react';
import {openTodos, recentEvents} from '../../domain/orchestrator';
import type {OrchestratorActions} from '../../store/useOrchestrator';
import type {AppState} from '../../domain/types';
import {fmtTime} from '../widgets';

const KIND_LABEL: Record<string, string> = {
  upgrade: '依赖升级',
  'license-change': '许可证更换',
  'mode-change': '交付方式变更',
  'modification-change': '修改标记变更',
  'add-dep': '新增依赖',
  claim: '材料认领',
  'fill-text': '补录正文',
  'fill-note': '补录修改说明',
  'fill-link': '登记外链',
  'confirm-assignment': '确认引用',
  'remove-assignment': '清除失效引用',
};

export function TodosPage({state, actions, goDep}: {state: AppState; actions: OrchestratorActions; goDep: (id: string) => void}) {
  const todos = openTodos(state);
  const history = recentEvents(state, 40);

  return (
    <div className="page two-col">
      <section>
        <div className="page-head">
          <div>
            <h2>
              <ListTodo size={18} /> 待办
            </h2>
            <p>升级或许可证更换后，只有原指派失效；新引用确认前留在这里，重开页面也不丢。</p>
          </div>
        </div>
        {todos.length === 0 ? (
          <div className="empty-card">
            <CheckCircle2 size={22} />
            <b>没有待办</b>
            <span>所有变更产生的引用都已确认。</span>
          </div>
        ) : (
          <div className="todo-list">
            {todos.map((t) => {
              const invalidated = state.assignments.filter(
                (a) => a.invalidatedEventId === t.event.id && a.state === 'invalidated',
              );
              const proposed = state.assignments.filter((a) => a.sinceEventId === t.event.id && a.state === 'proposed');
              return (
                <div key={t.event.id} className="todo-card">
                  <div className="todo-top">
                    <span className="todo-kind">{KIND_LABEL[t.event.kind] ?? t.event.kind}</span>
                    <span className="todo-time">{fmtTime(t.event.at)}</span>
                  </div>
                  <p>{t.event.message}</p>
                  {invalidated.length > 0 && (
                    <div className="todo-lines">
                      {invalidated.map((a) => (
                        <div key={a.id} className="todo-line invalid">
                          <span>
                            原指派失效：{state.deps.find((d) => d.id === a.depId)?.name} · {a.kind}
                            {a.invalidDetail ? `（${a.invalidDetail}）` : ''}
                          </span>
                          <button className="mini ghost" onClick={() => actions.remove(a.id)}>
                            清除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {proposed.length > 0 && (
                    <div className="todo-lines">
                      {proposed.map((a) => (
                        <div key={a.id} className="todo-line proposed">
                          <span>
                            新引用待确认：{state.deps.find((d) => d.id === a.depId)?.name} · {a.kind}
                            {t.pendingCount ? `（共 ${t.pendingCount} 条）` : ''}
                          </span>
                          <button className="mini primary" onClick={() => actions.confirm(a.id)}>
                            确认
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="todo-foot">
                    {t.event.depId && (
                      <button className="link-btn" onClick={() => goDep(t.event.depId!)}>
                        查看依赖 →
                      </button>
                    )}
                    <button className="link-btn dim" onClick={() => actions.resolveEvent(t.event.id)}>
                      标记已知悉
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="page-head">
          <div>
            <h2>
              <History size={18} /> 变更留痕
            </h2>
            <p>只追加的编排历史；每条失效引用都能追到原因事件。</p>
          </div>
        </div>
        <div className="history-list">
          {history.map((e) => (
            <div key={e.id} className={`history-row ${e.resolved ? '' : 'open'}`}>
              <span className={`dot ${e.resolved ? 'done' : 'open'}`} />
              <div>
                <b>{KIND_LABEL[e.kind] ?? e.kind}</b>
                <p>{e.message}</p>
                <small>{fmtTime(e.at)}</small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
