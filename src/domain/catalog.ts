// 资料层（catalog）：
// 只登记静态事实——许可证义务规则、材料目录、种子依赖、许可证正文原文。
// 不含任何「如何判定 / 如何编排」的逻辑。
import type {
  Dep,
  LicenseSpec,
  LicenseText,
  Material,
  MaterialKind,
  ObligationKind,
} from './types';

export const LICENSES: Record<string, LicenseSpec> = {
  MIT: {
    id: 'MIT',
    label: 'MIT',
    obligations: ['notice'],
  },
  'BSD-3-Clause': {
    id: 'BSD-3-Clause',
    label: 'BSD-3-Clause',
    obligations: ['notice'],
  },
  'Apache-2.0': {
    id: 'Apache-2.0',
    label: 'Apache-2.0',
    obligations: ['notice', 'changes'],
    changesMode: 'bundled',
  },
  'GPL-3.0': {
    id: 'GPL-3.0',
    label: 'GPL-3.0',
    obligations: ['notice', 'source', 'changes'],
    sourceMode: 'link',
    changesMode: 'link',
  },
};

export const LICENSE_IDS = Object.keys(LICENSES);

/** 义务中文标签 */
export const OBLIGATION_LABELS: Record<ObligationKind, string> = {
  notice: '署名 / 版权声明',
  source: '对应源码交付',
  changes: '修改内容披露',
};

export const MODE_LABELS = {
  bundled: '随包',
  link: '外链',
  none: '无',
} as const;

export interface MaterialCatalogEntry {
  kind: MaterialKind;
  name: string;
  /** 材料性质：合并件 / 外链登记 */
  nature: 'bundled' | 'link';
  /** 承载的义务种类 */
  obligation: ObligationKind;
  desc: string;
}

/** 材料目录：同一义务、同一交付方式的所有依赖合并为这一份材料 */
export const MATERIAL_CATALOG: Record<MaterialKind, MaterialCatalogEntry> = {
  'notice-bundled': {
    kind: 'notice-bundled',
    name: '随包声明与许可证汇编 NOTICE',
    nature: 'bundled',
    obligation: 'notice',
    desc: '随产品分发，合并所有依赖的版权声明与许可证正文。',
  },
  'source-bundled': {
    kind: 'source-bundled',
    name: '随包对应源码包 SOURCE-BUNDLE',
    nature: 'bundled',
    obligation: 'source',
    desc: '随产品分发，逐个依赖归档其对应完整源码并标注包内位置。',
  },
  'changes-bundled': {
    kind: 'changes-bundled',
    name: '随包修改说明 CHANGES',
    nature: 'bundled',
    obligation: 'changes',
    desc: '随产品分发，合并所有已修改依赖的修改说明。',
  },
  'source-link': {
    kind: 'source-link',
    name: '对应源码外链登记 SOURCE-LINKS',
    nature: 'link',
    obligation: 'source',
    desc: '登记每个需提供源码的依赖对应的完整源码外链。',
  },
  'changes-link': {
    kind: 'changes-link',
    name: '修改披露外链登记 CHANGE-LINKS',
    nature: 'link',
    obligation: 'changes',
    desc: '登记每个已修改依赖的修改说明外链。',
  },
};

export const MATERIAL_ORDER: MaterialKind[] = [
  'notice-bundled',
  'source-bundled',
  'changes-bundled',
  'source-link',
  'changes-link',
];

/** 与原页面保持一致的许可证配色 */
export const LICENSE_COLORS: Record<string, string> = {
  MIT: '#35b995',
  'BSD-3-Clause': '#6d9ee8',
  'Apache-2.0': '#b18ee4',
  'GPL-3.0': '#ec8c75',
};

const MIT_TEXT = `MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const BSD_TEXT = `BSD 3-Clause License

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software
   without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED.`;

export const SEED_DEPS: Dep[] = [
  {id: 'dep-react', name: 'react', version: '18.3.1', licenseId: 'MIT', source: 'npm', modified: false, note: '宽松许可，可商用'},
  {id: 'dep-lodash', name: 'lodash', version: '4.17.21', licenseId: 'MIT', source: 'npm', modified: false, note: '宽松许可，可商用'},
  {id: 'dep-chartjs', name: 'chart.js', version: '4.4.4', licenseId: 'MIT', source: 'npm', modified: false, note: '宽松许可，可商用'},
  {id: 'dep-highlight', name: 'highlight.js', version: '11.10.0', licenseId: 'BSD-3-Clause', source: 'npm', modified: false, note: '再发布需保留版权声明'},
  // GPL 且修改过：触发全部三类义务；且 GPL-3.0 正文缺录，演示「缺正文」暂缓
  {id: 'dep-legacy', name: 'legacy-parser', version: '2.1.0', licenseId: 'GPL-3.0', source: '手动', modified: true, note: '可能与闭源分发冲突'},
];

/** 仅录了 MIT / BSD 正文；GPL-3.0 缺正文。 */
export const SEED_LICENSE_TEXTS: LicenseText[] = [
  {licenseId: 'MIT', text: MIT_TEXT},
  {licenseId: 'BSD-3-Clause', text: BSD_TEXT},
];

/** 只有随包 NOTICE 有人认领，其余材料无人认领，演示暂缓区。 */
export const SEED_MATERIALS: Material[] = [
  {id: 'mat-notice', kind: 'notice-bundled', owner: 'Zen Li'},
  {id: 'mat-source-bundled', kind: 'source-bundled', owner: ''},
  {id: 'mat-changes-bundled', kind: 'changes-bundled', owner: ''},
  {id: 'mat-source-link', kind: 'source-link', owner: ''},
  {id: 'mat-changes-link', kind: 'changes-link', owner: ''},
];
