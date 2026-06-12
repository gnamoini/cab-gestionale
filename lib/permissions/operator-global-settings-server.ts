import "server-only";

import { cache } from "react";
import {
  OPERATOR_GLOBAL_SETTINGS_KEY,
  OPERATOR_GLOBAL_SETTINGS_MODULE,
  isOperatorGlobalSettingsEnabled,
  parseOperatorGlobalSettingsDbEnabled,
} from "@/lib/permissions/operator-global-settings";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

/** Flag DB da `app_settings` (sessione server utente) — dedupe per request RSC. */
export const fetchOperatorGlobalSettingsDbEnabledServer = cache(async (): Promise<boolean> => {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("app_settings")
    .select("value")
    .eq("module", OPERATOR_GLOBAL_SETTINGS_MODULE)
    .eq("key", OPERATOR_GLOBAL_SETTINGS_KEY)
    .maybeSingle();
  if (error) return false;
  return parseOperatorGlobalSettingsDbEnabled(data?.value);
});

/** Env + DB — uso in server actions / layout / guard. */
export async function resolveOperatorGlobalSettingsEnabledServer(): Promise<boolean> {
  const dbEnabled = await fetchOperatorGlobalSettingsDbEnabledServer();
  return isOperatorGlobalSettingsEnabled(dbEnabled);
}
