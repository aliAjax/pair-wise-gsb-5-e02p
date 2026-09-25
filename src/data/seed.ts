import type {Dependency, Fulfillment, LensState, Material, Obligation, ObligationKind, ObligationState} from '../domain/types';

const dep = (id: string, name: string, version: string, license: string, source: string): Dependency => ({id, name, version, license, source});

const ob = (
  depId: string,
  kind: ObligationKind,
  fulfillment: Fulfillment,
  materialId: string | null,
  state: ObligationState,
  note = '',
): Obligation => ({id: `${depId}:${kind}`, depId, kind, fulfillment, materialId, state, note, updatedAt: Date.now()});

const mat = (id: string, kind: ObligationKind, fulfillment: Fulfillment, title: string, body: string, owner: string): Material => ({
  id, kind, fulfillment, title, body, owner, updatedAt: Date.now(),
});

export function seedState(): LensState {
  const now = Date.now();
  return {
    deps: [
      dep('d-react', 'react', '18.3.1', 'MIT', 'npm'),
      dep('d-lodash', 'lodash', '4.17.21', 'MIT', 'npm'),
      dep('d-chartjs', 'chart.js', '4.4.4', 'MIT', 'npm'),
      dep('d-highlight', 'highlight.js', '11.10.0', 'BSD-3-Clause', 'npm'),
      dep('d-pdfkit', 'pdf-kit', '3.2.0', 'Apache-2.0', 'npm'),
      dep('d-legacy', 'legacy-parser', '2.1.0', 'GPL-3.0', '手动'),
    ],
    materials: [
      mat(
        'm-notice', 'attribution', 'bundled', 'NOTICE 署名清单',
        '本产品包含以下开源组件，版权归其作者所有：\nreact © Meta Platforms\nlodash © JS Foundation\nchart.js © Chart.js Contributors\nhighlight.js © Ivan Sagalaev\npdf-kit © Devon Govett\nlegacy-parser © Legacy Authors',
        'Zen Li',
      ),
      mat('m-mod', 'modification', 'bundled', '修改披露说明', '', ''),
      mat(
        'm-source', 'source', 'link', 'GPL 源码获取说明',
        '源码获取地址：https://example.org/legacy-parser/src\n对应版本：legacy-parser 2.1.0\n有效期：交付后三年内可索取',
        '',
      ),
    ],
    obligations: [
      ob('d-react', 'attribution', 'bundled', 'm-notice', 'assigned'),
      ob('d-lodash', 'attribution', 'bundled', 'm-notice', 'assigned'),
      ob('d-chartjs', 'attribution', 'bundled', 'm-notice', 'assigned'),
      ob('d-highlight', 'attribution', 'bundled', 'm-notice', 'assigned'),
      ob('d-pdfkit', 'attribution', 'bundled', 'm-notice', 'assigned'),
      ob('d-pdfkit', 'modification', 'bundled', 'm-mod', 'assigned'),
      ob('d-legacy', 'attribution', 'bundled', 'm-notice', 'assigned'),
      ob('d-legacy', 'source', 'link', 'm-source', 'assigned'),
      ob('d-legacy', 'modification', 'bundled', 'm-mod', 'invalidated', '许可证更换 GPL-2.0 → GPL-3.0，原指派失效'),
    ],
    events: [
      {
        id: 'ev-seed-2', at: now - 1000 * 60 * 18, reason: '许可证更换',
        detail: 'GPL-2.0 → GPL-3.0；修改披露的原指派失效，待重新确认，其余材料沿用',
        depId: 'd-legacy', depName: 'legacy-parser',
      },
      {
        id: 'ev-seed-1', at: now - 1000 * 60 * 60 * 26, reason: '依赖升级',
        detail: '版本 4.17.20 → 4.17.21，署名指派已重新确认并沿用「NOTICE 署名清单」',
        depId: 'd-lodash', depName: 'lodash',
      },
    ],
  };
}
