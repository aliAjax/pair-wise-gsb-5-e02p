import {Download, FileText} from 'lucide-react';
import type {LensState} from '../domain/types';
import {buildMaterialsMarkdown, isHolding} from '../domain/obligations';
import MaterialCard from '../components/MaterialCard';
import {Empty} from '../components/ui';

interface Props {
  state: LensState;
  highlightId: string | null;
  onOpenDep: (depId: string) => void;
  onSave: (materialId: string, patch: {body?: string; owner?: string}) => void;
}

export default function MaterialsPage({state, highlightId, onOpenDep, onSave}: Props) {
  const ready = state.materials.filter(m => !isHolding(m));

  const exportMd = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buildMaterialsMarkdown(state)], {type: 'text/markdown'}));
    a.download = 'obligation-materials.md';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="pane">
      <div className="pane-head">
        <div>
          <h2>正式材料</h2>
          <p>同一义务跨依赖合并出一份材料，引用逐项可追 · 共 {ready.length} 份</p>
        </div>
        <button className="outline" onClick={exportMd}><Download size={14}/>导出材料清单</button>
      </div>
      {ready.length === 0 ? (
        <Empty icon={<FileText size={26}/>} title="清单里还没有材料" hint="材料补齐正文与认领人后会从暂缓区回到这里。"/>
      ) : (
        <div className="mat-list pad">
          {ready.map(m => (
            <MaterialCard
              key={m.id}
              material={m}
              obligations={state.obligations}
              deps={state.deps}
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
