// License Lens · 义务编排台
// 领域类型层：只描述「是什么」，不含任何判定逻辑、存储与界面代码。

/** 义务种类：署名 / 源码交付 / 修改披露 */
export type ObligationKind = 'notice' | 'source' | 'changes';

/** 交付方式：随包分发 / 外链提供。无此项义务的许可证记 none */
export type DeliveryMode = 'bundled' | 'link' | 'none';

/** 引用（材料 ← 依赖义务）的指派状态。
 *  proposed   升级/换照/改标记后新生成，待确认
 *  active     已确认并编排进材料
 *  invalidated 原指派因变更失效，留痕可查、可清理 */
export type AssignmentState = 'proposed' | 'active' | 'invalidated';

/** 失效原因 */
export type InvalidationReason = 'upgrade' | 'license-change' | 'mode-change' | 'modification-change';

/** 许可证规则（资料层登记，判定层消费） */
export interface LicenseSpec {
  id: string;
  label: string;
  /** 该许可证触发的义务种类 */
  obligations: ObligationKind[];
  /** 源码交付默认方式（GPL 类默认外链，也允许切随包） */
  sourceMode?: Exclude<DeliveryMode, 'none'>;
  /** 修改披露允许的交付方式 */
  changesMode?: Exclude<DeliveryMode, 'none'>;
}

/** 依赖 */
export interface Dep {
  id: string;
  name: string;
  version: string;
  licenseId: string;
  source: string;
  /** 是否修改过依赖源码：true 时 GPL 类触发「修改披露」 */
  modified: boolean;
  note: string;
}

/** 材料种类：随包合并件 + 外链登记 */
export type MaterialKind =
  | 'notice-bundled'
  | 'source-bundled'
  | 'changes-bundled'
  | 'source-link'
  | 'changes-link';

/** 一份可交付材料 */
export interface Material {
  id: string;
  kind: MaterialKind;
  /** 责任人，空串 = 无人认领 */
  owner: string;
}

/** 依赖对某类义务的交付方式覆盖（如 GPL 源码由外链改随包） */
export interface ModeOverride {
  depId: string;
  kind: ObligationKind;
  mode: Exclude<DeliveryMode, 'none'>;
}

/** 引用：某依赖的某条义务编排进了哪份材料，逐项可追 */
export interface Assignment {
  id: string;
  materialId: string;
  depId: string;
  kind: ObligationKind;
  mode: Exclude<DeliveryMode, 'none'>;
  state: AssignmentState;
  /** 该指派产生的依据：初始 / 某次变更事件 */
  sinceEventId: string;
  /** 外链登记条目：该依赖源码/修改说明的 URL（仅 link 类引用需要） */
  linkUrl?: string;
  /** 随包源码交付条目：随附源码包的位置/文件名（仅 source-bundled 需要） */
  artifact?: string;
  /** 失效时指向的变更事件 */
  invalidatedEventId?: string;
  invalidReason?: InvalidationReason;
  invalidDetail?: string;
}

/** 许可证正文（法务可补录） */
export interface LicenseText {
  licenseId: string;
  text: string;
}

/** 修改说明正文（随包修改披露所需） */
export interface ChangeNote {
  depId: string;
  text: string;
}

/** 变更/待办事件。只追加，重开仍可见 */
export interface ChangeEvent {
  id: string;
  at: number;
  kind:
    | 'upgrade'
    | 'license-change'
    | 'mode-change'
    | 'modification-change'
    | 'add-dep'
    | 'claim'
    | 'fill-text'
    | 'fill-note'
    | 'fill-link'
    | 'confirm-assignment'
    | 'remove-assignment';
  depId?: string;
  materialId?: string;
  message: string;
  /** 是否已处理（仅用于「待办」筛选，事件永不删除） */
  resolved: boolean;
}

export interface AppState {
  version: 1;
  deps: Dep[];
  materials: Material[];
  assignments: Assignment[];
  modeOverrides: ModeOverride[];
  licenseTexts: LicenseText[];
  changeNotes: ChangeNote[];
  events: ChangeEvent[];
}
