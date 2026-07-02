import { useSyncExternalStore } from "react";
import {
  DEFAULT_PERSISTED_THEME_MODE,
  type PersistedThemeMode,
} from "@/lib/theme/user-theme-prefs";

export type ThemeRuntimeState = {
  resolved: PersistedThemeMode;
  themeReady: boolean;
  themeSaving: boolean;
};

let state: ThemeRuntimeState = {
  resolved: DEFAULT_PERSISTED_THEME_MODE,
  themeReady: false,
  themeSaving: false,
};

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getThemeRuntimeState(): ThemeRuntimeState {
  return state;
}

/** Aggiorna store tema senza re-render dell'albero App (solo subscriber `useTheme`). */
export function patchThemeRuntimeState(patch: Partial<ThemeRuntimeState>): void {
  const next: ThemeRuntimeState = { ...state, ...patch };
  if (
    next.resolved === state.resolved &&
    next.themeReady === state.themeReady &&
    next.themeSaving === state.themeSaving
  ) {
    return;
  }
  state = next;
  emit();
}

export function subscribeThemeRuntime(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function useThemeRuntimeStore(): ThemeRuntimeState {
  return useSyncExternalStore(subscribeThemeRuntime, getThemeRuntimeState, getThemeRuntimeState);
}
