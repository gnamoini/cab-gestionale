"use client";

import { APP_SETTINGS_COLUMNS } from "@/lib/db/table-select-columns";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { USER_PREFS_SETTINGS_MODULE, type PersistedThemeMode } from "@/lib/theme/user-theme-prefs";
import { applyAppSettingsUpsert } from "@/src/services/settings.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { AppSettingRow } from "@/src/types/supabase-tables";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export async function fetchUserPrefsRow(userId: string): Promise<ServiceResult<AppSettingRow | null>> {
  try {
    const c = getBrowserSupabase();
    const { data, error } = await c
      .from("app_settings")
      .select(APP_SETTINGS_COLUMNS)
      .eq("module", USER_PREFS_SETTINGS_MODULE)
      .eq("key", userId)
      .maybeSingle();
    if (error) return err(error.message);
    return success((data as AppSettingRow | null) ?? null);
  } catch (e) {
    return serviceFailFromError(e);
  }
}

export type UserThemeUpsertInput = {
  userId: string;
  theme: PersistedThemeMode;
  expectedUpdatedAt?: string;
};

export async function upsertUserThemePref(input: UserThemeUpsertInput): Promise<ServiceResult<AppSettingRow>> {
  try {
    const c = getBrowserSupabase();
    const {
      data: { user },
    } = await c.auth.getUser();
    if (!user?.id || user.id !== input.userId) {
      return err("Sessione non valida.");
    }
    return applyAppSettingsUpsert(c, {
      module: USER_PREFS_SETTINGS_MODULE,
      key: input.userId,
      value: { theme: input.theme },
      expectedUpdatedAt: input.expectedUpdatedAt,
    });
  } catch (e) {
    return serviceFailFromError(e);
  }
}
