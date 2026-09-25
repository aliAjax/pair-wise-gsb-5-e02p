import {useState} from 'react';
import type {Dependency} from '../domain/types';
import {LICENSES} from '../data/licenses';
import {Modal} from './ui';

export function AddDepModal({onClose, onAdd}: {onClose: () => void; onAdd: (input: {name: string; version: string; license: string; source: string}) => void}) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [license, setLicense] = useState('MIT');
  const [source, setSource] = useState('npm');
  return (
    <Modal title="添加依赖" onClose={onClose}>
      <label>依赖名称<input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="例如 date-fns"/></label>
      <label>版本<input value={version} onChange={e => setVersion(e.target.value)}/></label>
      <label>
        许可证
        <select value={license} onChange={e => setLicense(e.target.value)}>
          {LICENSES.map(l => <option key={l}>{l}</option>)}
        </select>
      </label>
      <label>
        来源
        <select value={source} onChange={e => setSource(e.target.value)}>
          <option>npm</option>
          <option>手动</option>
          <option>镜像</option>
        </select>
      </label>
      <p className="hint">登记后按许可证生成义务清单，逐项指派材料即可交付。</p>
      <button className="primary full" disabled={!name.trim()} onClick={() => onAdd({name: name.trim(), version: version.trim() || '1.0.0', license, source})}>
        登记并生成义务
      </button>
    </Modal>
  );
}

export function UpdateDepModal({dep, onClose, onUpdate}: {dep: Dependency; onClose: () => void; onUpdate: (patch: {version?: string; license?: string}) => void}) {
  const [version, setVersion] = useState(dep.version);
  const [license, setLicense] = useState(dep.license);
  const changed = (version.trim() !== '' && version.trim() !== dep.version) || license !== dep.license;
  return (
    <Modal title={`变更 ${dep.name}`} onClose={onClose}>
      <label>版本<input autoFocus value={version} onChange={e => setVersion(e.target.value)}/></label>
      <label>
        许可证
        <select value={license} onChange={e => setLicense(e.target.value)}>
          {LICENSES.map(l => <option key={l}>{l}</option>)}
        </select>
      </label>
      <div className="note">只让该依赖的现有指派失效并写入待办；其他依赖与已合并的材料不受影响，可继续沿用。</div>
      <button className="primary full" disabled={!changed} onClick={() => onUpdate({version, license})}>确认变更</button>
    </Modal>
  );
}
