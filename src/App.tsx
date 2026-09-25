import {useMemo, useState} from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ClipboardList,
  FileCode2,
  Layers3,
  ListTodo,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {buildMaterialViews, openTodos} from './domain/orchestrator';
import {useOrchestrator} from './store/useOrchestrator';
import {MaterialSheet} from './ui/MaterialSheet';
import {ChecklistPage} from './ui/pages/ChecklistPage';
import {DependenciesPage} from './ui/pages/DependenciesPage';
import {HoldingPage} from './ui/pages/HoldingPage';
import {TodosPage} from './ui/pages/TodosPage';

type NavKey = 'checklist' | 'holding' | 'deps' | 'todos';

const NAV: {key: NavKey; label: string; icon: React.ReactNode}[] = [
  {key: 'checklist', label: '交付清单', icon: <ClipboardList size={16} />},
  {key: 'holding', label: '暂缓区', icon: <AlertTriangle size={16} />},
  {key: 'deps', label: '依赖与义务', icon: <Layers3 size={16} />},
  {key: 'todos', label: '待办与变更', icon: <ListTodo size={16} />},
];

export default function App() {
  const {state, actions} = useOrchestrator();
  const [nav, setNav] = useState<NavKey>('checklist');
  const [openMaterial, setOpenMaterial] = useState<string | null>(null);
  const [focusDep, setFocusDep] = useState<string | undefined>(undefined);

  const views = useMemo(() => buildMaterialViews(state), [state]);
  const heldCount = views.filter((v) => v.status === 'held').length;
  const readyCount = views.filter((v) => v.status === 'ready').length;
  const todoCount = openTodos(state).length;
  const openView = openMaterial ? views.find((v) => v.material.id === openMaterial) : undefined;

  const goDep = (depId: string) => {
    setOpenMaterial(null);
    setFocusDep(depId);
    setNav('deps');
  };

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <div className="brand-icon">
            <ShieldCheck size={18} />
          </div>
          <div>
            <b>License Lens</b>
            <small>OBLIGATION DESK</small>
          </div>
        </div>
        <div className="nav-title">义务编排台</div>
        {NAV.map((n) => (
          <button
            key={n.key}
            className={nav === n.key && !openView ? 'nav active' : 'nav'}
            onClick={() => {
              setNav(n.key);
              setOpenMaterial(null);
              setFocusDep(undefined);
            }}
          >
            {n.icon}
            {n.label}
            {n.key === 'holding' && heldCount > 0 && <span className="red">{heldCount}</span>}
            {n.key === 'todos' && todoCount > 0 && <span className="red">{todoCount}</span>}
            {n.key === 'checklist' && readyCount > 0 && <span>{readyCount}</span>}
          </button>
        ))}

        <div className="aside-bottom">
          <div className="mini-card">
            <Sparkles size={16} />
            <div>
              <b>编排状态</b>
              <small>
                {readyCount} 份就绪 · {heldCount} 份暂缓 · {state.deps.length} 个依赖
              </small>
            </div>
          </div>
          <button className="reset-btn" onClick={() => { if (confirm('恢复为演示初始数据？当前编排将被重置。')) {actions.reset(); setOpenMaterial(null);} }}>
            <RotateCcw size={12} /> 恢复演示数据
          </button>
          <div className="user">
            <div className="avatar">ZL</div>
            <span>Zen Li</span>
            <ChevronDown size={14} />
          </div>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <div className="crumb">
              WORKSPACE / <b>OPEN-SOURCE DELIVERY</b>
            </div>
            <h1>开源交付义务编排台</h1>
            <p>法务可见每份义务附在哪份材料：署名、源码交付、修改披露，随包或外链，逐项可追。</p>
          </div>
          <div className="head-stats">
            <div className="head-stat ok">
              <PackageCheck size={15} />
              <div><b>{readyCount}</b><small>就绪材料</small></div>
            </div>
            <div className={`head-stat ${heldCount ? 'risk' : ''}`}>
              <AlertTriangle size={15} />
              <div><b>{heldCount}</b><small>暂缓缺口</small></div>
            </div>
            <div className="head-stat">
              <FileCode2 size={15} />
              <div><b>{state.deps.length}</b><small>依赖</small></div>
            </div>
          </div>
        </header>

        {openView ? (
          <MaterialSheet state={state} view={openView} actions={actions} onBack={() => setOpenMaterial(null)} />
        ) : nav === 'checklist' ? (
          <ChecklistPage state={state} actions={actions} onOpen={setOpenMaterial} />
        ) : nav === 'holding' ? (
          <HoldingPage state={state} actions={actions} onOpen={setOpenMaterial} />
        ) : nav === 'deps' ? (
          <DependenciesPage state={state} actions={actions} focusDepId={focusDep} />
        ) : (
          <TodosPage state={state} actions={actions} goDep={goDep} />
        )}
      </main>
    </div>
  );
}
