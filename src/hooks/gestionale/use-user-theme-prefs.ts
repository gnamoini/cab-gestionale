"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { isAuthSessionEstablished, type AuthStatus } from "@/src/lib/auth/auth-status";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";
import { themeModeFromSettingsValue, type PersistedThemeMode } from "@/lib/theme/user-theme-prefs";
import { persistSettingsRecord } from "@/lib/sync/persist-settings-record";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { fetchUserPrefsRow, upsertUserThemePref } from "@/src/services/user-prefs.service";
import { err } from "@/src/services/service-result";
import { SETTINGS_CONCURRENCY_CONFLICT } from "@/src/services/settings.service";

export function userThemePrefsQueryKey(userId: string) {
  return [...QK.settings, "user_prefs", userId] as const;
}

export function useUserThemePrefsQuery(userId: string | undefined, authStatus: AuthStatus) {
  const enabled = isSupabasePublicEnvConfigured() && isAuthSessionEstablished(authStatus) && !!userId;
  return useQuery({
    queryKey: userId ? userThemePrefsQueryKey(userId) : (["app_settings", "user_prefs", "none"] as const),
    queryFn: async (): Promise<{ theme: PersistedThemeMode | null; updatedAt: string | null }> => {
      if (!userId) return { theme: null, updatedAt: null };
      const r = await fetchUserPrefsRow(userId);
      if (!r.success) throw new Error(r.error ?? "Errore preferenze utente");
      const row = r.data;
      return {
        theme: themeModeFromSettingsValue(row?.value),
        updatedAt: row?.updated_at ?? null,
      };
    },
    enabled,
    staleTime: 60_000,
    gcTime: 86_400_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useUserThemeUpsertMutation(userId: string | undefined) {
  const qc = useQueryClient();
  const gestToast = useGestionaleToast();
  return useServiceMutation(
    (theme: PersistedThemeMode) => {
      if (!userId) return Promise.resolve(err("Utente non autenticato."));
      const cached = qc.getQueryData<{ theme: PersistedThemeMode | null; updatedAt: string | null }>(
        userThemePrefsQueryKey(userId),
      );
      return persistSettingsRecord(qc, () =>
        upsertUserThemePref({
          userId,
          theme,
          expectedUpdatedAt: cached?.updatedAt ?? undefined,
        }),
      );
    },
    {
      onSuccess: (row, theme) => {
        if (!userId || !row) return;
        qc.setQueryData(userThemePrefsQueryKey(userId), {
          theme,
          updatedAt: row.updated_at,
        });
      },
      onError: (e) => {
        if (e.message === SETTINGS_CONCURRENCY_CONFLICT) {
          gestToast.warning("Preferenza tema aggiornata da un altro dispositivo.");
          if (userId) void qc.invalidateQueries({ queryKey: userThemePrefsQueryKey(userId) });
        }
      },
    },
  );
}
