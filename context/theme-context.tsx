"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import {
  applyPersistedThemeToDocument,
  resolveBootThemeMode,
  writeThemeBootCache,
} from "@/lib/theme/cab-theme-storage";
import {
  DEFAULT_PERSISTED_THEME_MODE,
  type PersistedThemeMode,
} from "@/lib/theme/user-theme-prefs";
import {
  getThemeRuntimeState,
  patchThemeRuntimeState,
  useThemeRuntimeStore,
} from "@/lib/theme/theme-runtime-store";
import { useUserThemePrefsQuery, useUserThemeUpsertMutation } from "@/src/hooks/gestionale/use-user-theme-prefs";

export type { PersistedThemeMode };

const toggleLightDarkRef: { current: () => void } = { current: () => {} };

/** Hook/query isolati: re-render solo di questo nodo null, non di `{children}`. */
function ThemePrefsController() {
  const { user, status } = useAuth();
  const userId = isAuthSessionEstablished(status) ? user?.id : undefined;

  const optimisticThemeRef = useRef<PersistedThemeMode | null>(null);

  const prefsQuery = useUserThemePrefsQuery(userId, status);
  const themeMutation = useUserThemeUpsertMutation(userId);

  const applyResolved = useCallback(
    (mode: PersistedThemeMode) => {
      applyPersistedThemeToDocument(mode);
      writeThemeBootCache(mode);
      patchThemeRuntimeState({ resolved: mode });
    },
    [],
  );

  useEffect(() => {
    toggleLightDarkRef.current = () => {
      const next: PersistedThemeMode = getThemeRuntimeState().resolved === "dark" ? "light" : "dark";
      optimisticThemeRef.current = next;
      applyResolved(next);

      if (!userId) return;

      patchThemeRuntimeState({ themeSaving: true });
      themeMutation.mutate(next, {
        onSettled: () => {
          optimisticThemeRef.current = null;
          patchThemeRuntimeState({ themeSaving: false });
        },
      });
    };
  }, [applyResolved, userId, themeMutation]);

  useEffect(() => {
    const boot = resolveBootThemeMode();
    applyPersistedThemeToDocument(boot);
    writeThemeBootCache(boot);
    patchThemeRuntimeState({ resolved: boot, themeReady: true });
    document.documentElement.dataset.ready = "1";
  }, []);

  useEffect(() => {
    if (!userId || prefsQuery.isLoading) return;
    if (optimisticThemeRef.current) return;

    const next = prefsQuery.data?.theme ?? DEFAULT_PERSISTED_THEME_MODE;
    if (next === getThemeRuntimeState().resolved) return;

    applyPersistedThemeToDocument(next);
    writeThemeBootCache(next);
    patchThemeRuntimeState({ resolved: next });
  }, [userId, prefsQuery.isLoading, prefsQuery.data?.theme, applyResolved]);

  useEffect(() => {
    if (userId) return;
    optimisticThemeRef.current = null;
    const boot = resolveBootThemeMode();
    if (boot === getThemeRuntimeState().resolved) return;
    applyPersistedThemeToDocument(boot);
    writeThemeBootCache(boot);
    patchThemeRuntimeState({ resolved: boot, themeSaving: false });
  }, [userId]);

  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <ThemePrefsController />
      {children}
    </>
  );
}

export function useTheme() {
  const { resolved, themeReady, themeSaving } = useThemeRuntimeStore();
  return {
    resolved,
    themeReady,
    themeSaving,
    toggleLightDark: () => toggleLightDarkRef.current(),
  };
}
