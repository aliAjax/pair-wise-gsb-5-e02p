// 存储层（store）：
// 只管 AppState 的加载、持久化与动作转发；不做任何判定，也不含界面。
import {useEffect, useMemo, useState} from 'react';
import {
  addDep as actionAddDep,
  changeLicense as actionChangeLicense,
  claimMaterial as actionClaim,
  confirmAssignment as actionConfirm,
  createInitialState,
  fillChangeNote as actionFillNote,
  fillLicenseText as actionFillText,
  removeAssignment as actionRemove,
  resolveEvent as actionResolveEvent,
  setAssignmentArtifact as actionSetArtifact,
  setAssignmentLink as actionSetLink,
  setMode as actionSetMode,
  setModified as actionSetModified,
  upgradeDep as actionUpgrade,
} from '../domain/orchestrator';
import type {AppState, ObligationKind} from '../domain/types';

const KEY = 'license-lens-orchestration-v1';

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.deps)) return parsed;
    }
  } catch {
    /* 损坏数据回落到种子 */
  }
  return createInitialState();
}

export type OrchestratorActions = ReturnType<typeof useOrchestrator>['actions'];

export function useOrchestrator() {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* 存储不可用时仅影响持久化，不影响当前会话 */
    }
  }, [state]);

  const act = useMemo(
    () => ({
      addDep: (input: {name: string; licenseId: string; version?: string; source?: string}) =>
        setState((s) => actionAddDep(s, input)),
      upgradeDep: (depId: string, version: string) => setState((s) => actionUpgrade(s, depId, version)),
      changeLicense: (depId: string, licenseId: string) => setState((s) => actionChangeLicense(s, depId, licenseId)),
      setModified: (depId: string, modified: boolean) => setState((s) => actionSetModified(s, depId, modified)),
      setMode: (depId: string, kind: ObligationKind, mode: 'bundled' | 'link') =>
        setState((s) => actionSetMode(s, depId, kind, mode)),
      claim: (materialId: string, owner: string) => setState((s) => actionClaim(s, materialId, owner)),
      fillText: (licenseId: string, text: string) => setState((s) => actionFillText(s, licenseId, text)),
      fillNote: (depId: string, text: string) => setState((s) => actionFillNote(s, depId, text)),
      setLink: (assignmentId: string, url: string) => setState((s) => actionSetLink(s, assignmentId, url)),
      setArtifact: (assignmentId: string, artifact: string) =>
        setState((s) => actionSetArtifact(s, assignmentId, artifact)),
      confirm: (assignmentId: string) => setState((s) => actionConfirm(s, assignmentId)),
      remove: (assignmentId: string) => setState((s) => actionRemove(s, assignmentId)),
      resolveEvent: (eventId: string) => setState((s) => actionResolveEvent(s, eventId)),
      reset: () => setState(createInitialState()),
    }),
    [],
  );

  return {state, actions: act};
}
