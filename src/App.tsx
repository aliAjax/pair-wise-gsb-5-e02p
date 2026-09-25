import {useEffect, useMemo, useState} from 'react';
import {ChevronDown, ClipboardList, FileText, Inbox, Layers3, Plus, RotateCcw, ShieldCheck, Sparkles} from 'lucide-react';
import type {Dependency, LensState} from './domain/types';
import {isHolding, todosOf} from './domain/obligations';
import {addDependency, applyDepUpdate, assignObligation, assignToNewMaterial, changeFulfillment, updateMaterial} from './domain/changes';
import {loadState, resetState, saveState} from './storage/store';
import DepsPage from './pages/DepsPage';
import MaterialsPage from './pages/MaterialsPage';
import HoldingPage from './pages/HoldingPage';
import TodosPage from './pages/TodosPage';
import AssignModal from './components/AssignModal';
import {AddDepModal, UpdateDepModal} from './components/DepModals';

type View = 'deps' | 'materials' | 'holding' | 'todos';

const VIEW_META: Record<View, {crumb: string; title: string; desc: string}> = {
  deps: {crumb: 'OBLIGATIONS', title: '许可证义务编排', desc: '按依赖逐项确认署名、源码交付与修改披露，随包或外链都有去向。'},
  materials: {crumb: 'MATERIALS', title: '义务材料清单', desc: '同一义务跨多个依赖合并出一份材料，引用关系逐项可追。'},
  holding: {crumb: 'HOLDING', title: '暂缓区', desc: '缺正文或缺认领人的材料停在这里，写明缺口，补齐后自动回到清单。'},
  todos: {crumb: 'TODOS & CHANGES', title: '待办与变更', desc: '升级与换证只让原指派失效，其余材料沿用；待办与变更原因在此留痕。'},
};

export default function App() {
  const [state, setState] = useState<LensState>(loadState);
  const [view, setView] = useState<View>('deps');
  const [selectedDep, setSelectedDep] = useState<string | null>(null);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [updateDepId, setUpdateDepId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [highlightMaterial, setHighlightMaterial] = useState<string | null>(null);

  useEffect(() => saveState(state), [state]);

  const todos = useMemo(() => todosOf(state), [state]);
  const holdingCount = state.materials.filter(isHolding).length;
  const assignedCount = state.obligations.filter(o => o.state === 'assigned').length;
  const invalidatedCount = state.obligations.filter(o => o.state === 'invalidated').length;

  const openMaterial = (materialId: string) => {
    const m = state.materials.find(mm => mm.id === materialId);
    if (!m) return;
    setView(isHolding(m) ? 'holding' : 'materials');
    setHighlightMaterial(materialId);
    window.setTimeout(() => setHighlightMaterial(cur => (cur === materialId ? null : cur)), 2400);
  };
  const openDep = (depId: string) => {
    setSelectedDep(depId);
    setView('deps');
  };

  const assignOb = assignId ? state.obligations.find(o => o.id === assignId) : undefined;
  const updateDep: Dependency | undefined = updateDepId ? state.deps.find(d => d.id === updateDepId) : undefined;
  const meta = VIEW_META[view];

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <div className="brand-icon"><ShieldCheck size={18}/></div>
          <div><b>License Lens</b><small>obligation console</small></div>
        </div>
        <div className="nav-title">CONSOLE</div>
        <button className={view === 'deps' ? 'nav active' : 'nav'} onClick={() => setView('deps')}><Layers3 size={16}/>依赖清单</button>
        <button className={view === 'materials' ? 'nav active' : 'nav'} onClick={() => setView('materials')}>
          义务材料 <span>{state.materials.length - holdingCount}</span>
        </button>
        <button className={view === 'holding' ? 'nav active' : 'nav'} onClick={() => setView('holding')}>
          <Inbox size={16}/>暂缓区 {holdingCount > 0 && <span className="orange">{holdingCount}</span>}
        </button>
        <button className={view === 'todos' ? 'nav active' : 'nav'} onClick={() => setView('todos')}>
          <ClipboardList size={16}/>待办与变更 {todos.length > 0 && <span className="red">{todos.length}</span>}
        </button>
        <div className="aside-bottom">
          <div className="mini-card">
            <Sparkles size={16}/>
            <div><b>本地已保存</b><small>重开后待办与变更原因保留</small></div>
          </div>
          <button className="reset" onClick={() => { setState(resetState()); setSelectedDep(null); }}>
            <RotateCcw size={12}/>重置演示数据
          </button>
          <div className="user"><div className="avatar">ZL</div><span>Zen Li</span><ChevronDown size={14}/></div>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <div className="crumb">LICENSE LENS / <b>{meta.crumb}</b></div>
            <h1>{meta.title}</h1>
            <p>{meta.desc}</p>
          </div>
          <div className="head-actions">
            <button className="primary" onClick={() => setShowAdd(true)}><Plus size={16}/>添加依赖</button>
          </div>
        </header>
        <section className="summary">
          <div><span>依赖总数</span><b>{state.deps.length}</b><small>{assignedCount}/{state.obligations.length} 项义务已指派</small></div>
          <div><span>义务材料</span><b className="teal">{state.materials.length - holdingCount}</b><small>暂缓区 {holdingCount} 份</small></div>
          <div><span>待办事项</span><b className="orange">{todos.length}</b><small>含失效指派 {invalidatedCount} 项</small></div>
          <div><span>变更留痕</span><b>{state.events.length}</b><small>升级与换证原因可查</small></div>
        </section>
        {view === 'deps' && (
          <DepsPage
            state={state}
            selectedId={selectedDep}
            onSelect={setSelectedDep}
            onAssign={setAssignId}
            onUpdateDep={d => setUpdateDepId(d.id)}
            onOpenMaterial={openMaterial}
            onFulfillment={(id, f) => setState(s => changeFulfillment(s, id, f))}
          />
        )}
        {view === 'materials' && (
          <MaterialsPage state={state} highlightId={highlightMaterial} onOpenDep={openDep} onSave={(id, patch) => setState(s => updateMaterial(s, id, patch))}/>
        )}
        {view === 'holding' && (
          <HoldingPage state={state} highlightId={highlightMaterial} onOpenDep={openDep} onSave={(id, patch) => setState(s => updateMaterial(s, id, patch))}/>
        )}
        {view === 'todos' && (
          <TodosPage state={state} todos={todos} onAssign={setAssignId} onGoHolding={openMaterial}/>
        )}
      </main>
      {showAdd && (
        <AddDepModal
          onClose={() => setShowAdd(false)}
          onAdd={input => {
            const next = addDependency(state, input);
            setState(next);
            setSelectedDep(next.deps[next.deps.length - 1]?.id ?? null);
            setView('deps');
            setShowAdd(false);
          }}
        />
      )}
      {updateDep && (
        <UpdateDepModal
          dep={updateDep}
          onClose={() => setUpdateDepId(null)}
          onUpdate={patch => { setState(s => applyDepUpdate(s, updateDep.id, patch)); setUpdateDepId(null); }}
        />
      )}
      {assignOb && (
        <AssignModal
          obligation={assignOb}
          dep={state.deps.find(d => d.id === assignOb.depId)}
          materials={state.materials}
          obligations={state.obligations}
          onClose={() => setAssignId(null)}
          onAssign={mid => { setState(s => assignObligation(s, assignOb.id, mid)); setAssignId(null); }}
          onAssignNew={title => { setState(s => assignToNewMaterial(s, assignOb.id, title)); setAssignId(null); }}
        />
      )}
    </div>
  );
}
