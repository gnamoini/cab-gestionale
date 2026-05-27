"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import { useUserThemePrefsQuery, useUserThemeUpsertMutation } from "@/src/hooks/gestionale/use-user-theme-prefs";

export type { PersistedThemeMode };

type ThemeContextValue = {
  resolved: PersistedThemeMode;
  /** True dopo bootstrap locale (evita mismatch idratazione sul toggle). */
  themeReady: boolean;
  /** Salvataggio preferenza su DB in corso. */
  themeSaving: boolean;
  toggleLightDark: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const userId = isAuthSessionEstablished(status) ? user?.id : undefined;

  const [resolved, setResolved] = useState<PersistedThemeMode>(DEFAULT_PERSISTED_THEME_MODE);
  const [themeReady, setThemeReady] = useState(false);
  const optimisticThemeRef = useRef<PersistedThemeMode | null>(null);

  const prefsQuery = useUserThemePrefsQuery(userId, status);
  const themeMutation = useUserThemeUpsertMutation(userId);

  /** Allinea React alla cache boot (DOM già impostato dallo script blocking in RootLayout). */
  useEffect(() => {
    const boot = resolveBootThemeMode();
    setResolved(boot);
    applyPersistedThemeToDocument(boot);
    setThemeReady(true);
  }, []);

  /** Preferenza DB autenticato (source of truth); assenza riga → default globale dark. */
  useEffect(() => {
    if (!userId || prefsQuery.isLoading) return;
    if (optimisticThemeRef.current) return;

    const serverTheme = prefsQuery.data?.theme;
    const next = serverTheme ?? DEFAULT_PERSISTED_THEME_MODE;
    setResolved(next);
    applyPersistedThemeToDocument(next);
    writeThemeBootCache(next);
  }, [userId, prefsQuery.isLoading, prefsQuery.data?.theme]);

  /** Logout / sessione assente: torna alla cache locale (login e app coerenti). */
  useEffect(() => {
    if (userId) return;
    optimisticThemeRef.current = null;
    const boot = resolveBootThemeMode();
    setResolved(boot);
    applyPersistedThemeToDocument(boot);
  }, [userId]);

  const applyResolved = useCallback((mode: PersistedThemeMode) => {
    setResolved(mode);
    applyPersistedThemeToDocument(mode);
    writeThemeBootCache(mode);
  }, []);

  const toggleLightDark = useCallback(() => {
    const next: PersistedThemeMode = resolved === "dark" ? "light" : "dark";
    optimisticThemeRef.current = next;
    applyResolved(next);

    if (!userId) return;

    themeMutation.mutate(next, {
      onSettled: () => {
        optimisticThemeRef.current = null;
      },
    });
  }, [applyResolved, resolved, themeMutation, userId]);

  const value = useMemo(
    () => ({
      resolved,
      themeReady,
      themeSaving: themeMutation.isPending,
      toggleLightDark,
    }),
    [resolved, themeReady, themeMutation.isPending, toggleLightDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
