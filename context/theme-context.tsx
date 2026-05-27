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
  systemPrefersDark,
  writeThemeBootCache,
} from "@/lib/theme/cab-theme-storage";
import type { PersistedThemeMode } from "@/lib/theme/user-theme-prefs";
import { useUserThemePrefsQuery, useUserThemeUpsertMutation } from "@/src/hooks/gestionale/use-user-theme-prefs";

export type { PersistedThemeMode };

function fallbackThemeMode(): PersistedThemeMode {
  return systemPrefersDark() ? "dark" : "light";
}

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

  const [resolved, setResolved] = useState<PersistedThemeMode>("light");
  const [themeReady, setThemeReady] = useState(false);
  const optimisticThemeRef = useRef<PersistedThemeMode | null>(null);

  const prefsQuery = useUserThemePrefsQuery(userId, status);
  const themeMutation = useUserThemeUpsertMutation(userId);

  /** Solo stato React: il DOM `<html>` è già impostato dallo script blocking in RootLayout. */
  useEffect(() => {
    setResolved(resolveBootThemeMode());
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!userId || prefsQuery.isLoading) return;
    if (optimisticThemeRef.current) return;

    const serverTheme = prefsQuery.data?.theme;
    const next = serverTheme ?? fallbackThemeMode();
    setResolved(next);
    applyPersistedThemeToDocument(next);
    writeThemeBootCache(next);
  }, [userId, prefsQuery.isLoading, prefsQuery.data?.theme]);

  useEffect(() => {
    if (!userId) {
      optimisticThemeRef.current = null;
    }
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
