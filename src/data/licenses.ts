import type {Fulfillment, ObligationKind} from '../domain/types';

export interface ObligationTemplate {
  kind: ObligationKind;
  fulfillment: Fulfillment;
}

export const LICENSES = ['MIT', 'BSD-3-Clause', 'Apache-2.0', 'LGPL-3.0', 'GPL-3.0'];

export const LICENSE_COLORS: Record<string, string> = {
  MIT: '#35b995',
  'BSD-3-Clause': '#6d9ee8',
  'Apache-2.0': '#b18ee4',
  'LGPL-3.0': '#e0b25c',
  'GPL-3.0': '#ec8c75',
};

const LICENSE_OBLIGATIONS: Record<string, ObligationTemplate[]> = {
  MIT: [{kind: 'attribution', fulfillment: 'bundled'}],
  'BSD-3-Clause': [{kind: 'attribution', fulfillment: 'bundled'}],
  'Apache-2.0': [
    {kind: 'attribution', fulfillment: 'bundled'},
    {kind: 'modification', fulfillment: 'bundled'},
  ],
  'LGPL-3.0': [
    {kind: 'attribution', fulfillment: 'bundled'},
    {kind: 'source', fulfillment: 'link'},
  ],
  'GPL-3.0': [
    {kind: 'attribution', fulfillment: 'bundled'},
    {kind: 'source', fulfillment: 'link'},
    {kind: 'modification', fulfillment: 'bundled'},
  ],
};

export function templatesFor(license: string): ObligationTemplate[] {
  return LICENSE_OBLIGATIONS[license] ?? [{kind: 'attribution', fulfillment: 'bundled'}];
}
