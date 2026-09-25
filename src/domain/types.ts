export type ObligationKind = 'attribution' | 'source' | 'modification';
export type Fulfillment = 'bundled' | 'link';
export type ObligationState = 'assigned' | 'pending' | 'invalidated';

export interface Dependency {
  id: string;
  name: string;
  version: string;
  license: string;
  source: string;
}

export interface Obligation {
  id: string;
  depId: string;
  kind: ObligationKind;
  fulfillment: Fulfillment;
  materialId: string | null;
  state: ObligationState;
  note: string;
  updatedAt: number;
}

export interface Material {
  id: string;
  kind: ObligationKind;
  fulfillment: Fulfillment;
  title: string;
  body: string;
  owner: string;
  updatedAt: number;
}

export interface ChangeEvent {
  id: string;
  at: number;
  reason: string;
  detail: string;
  depId?: string;
  depName?: string;
}

export interface LensState {
  deps: Dependency[];
  obligations: Obligation[];
  materials: Material[];
  events: ChangeEvent[];
}

export const KIND_LABEL: Record<ObligationKind, string> = {
  attribution: '署名',
  source: '源码交付',
  modification: '修改披露',
};

export const FULFILLMENT_LABEL: Record<Fulfillment, string> = {
  bundled: '随包',
  link: '外链',
};

export const OBLIGATION_STATE_LABEL: Record<ObligationState, string> = {
  assigned: '已指派',
  pending: '待指派',
  invalidated: '已失效',
};
