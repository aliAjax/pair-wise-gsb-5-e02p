import {seedState} from '../data/seed';
import type {LensState} from '../domain/types';

const KEY = 'license-lens-console-v1';

export function loadState(): LensState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as LensState;
    if (!parsed || !Array.isArray(parsed.deps) || !Array.isArray(parsed.obligations) || !Array.isArray(parsed.materials)) {
      return seedState();
    }
    return {...parsed, events: Array.isArray(parsed.events) ? parsed.events : []};
  } catch {
    return seedState();
  }
}

export function saveState(state: LensState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时静默失败，页面内状态仍可用
  }
}

export function resetState(): LensState {
  const fresh = seedState();
  saveState(fresh);
  return fresh;
}
