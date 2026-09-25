// 页面层公用小组件与格式化工具（不含判定逻辑）
import type {ReactNode} from 'react';
import {X} from 'lucide-react';

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="关闭">
            <X size={17} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function StatusPill({status}: {status: 'ready' | 'held' | 'idle'}) {
  const map = {
    ready: {cls: 'ok', text: '就绪 · 可交付'},
    held: {cls: 'risk', text: '暂缓 · 有缺口'},
    idle: {cls: 'idle', text: '闲置 · 无义务引用'},
  } as const;
  const m = map[status];
  return <span className={`pill ${m.cls}`}>{m.text}</span>;
}
