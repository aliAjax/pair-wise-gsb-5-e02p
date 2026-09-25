import type {ReactNode} from 'react';

export const REASON_TONE: Record<string, string> = {
  依赖升级: 'orange',
  许可证更换: 'red',
  交付方式调整: 'blue',
  义务指派: 'teal',
  重新指派: 'teal',
  材料补齐: 'teal',
  登记依赖: 'grey',
};

export function Pill({tone, children}: {tone: string; children: ReactNode}) {
  return <i className={`pill ${tone}`}>{children}</i>;
}

export function Modal({title, onClose, children}: {title: string; onClose: () => void; children: ReactNode}) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({icon, title, hint}: {icon: ReactNode; title: string; hint: string}) {
  return (
    <div className="empty">
      {icon}
      <b>{title}</b>
      <p>{hint}</p>
    </div>
  );
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
