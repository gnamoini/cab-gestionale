"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import {
  OPERATOR_GLOBAL_SETTINGS_KEY,
  OPERATOR_GLOBAL_SETTINGS_MODULE,
  parseOperatorGlobalSettingsDbEnabled,
} from "@/lib/permissions/operator-global-settings";

/** Flag DB da `app_settings` (sessione browser). */
export async function fetchOperatorGlobalSettingsDbEnabledClient(): Promise<boolean> {
  const sb = getBrowserSupabase();
  const { data, error } = await sb
    .from("app_settings")
    .select("value")
    .eq("module", OPERATOR_GLOBAL_SETTINGS_MODULE)
    .eq("key", OPERATOR_GLOBAL_SETTINGS_KEY)
    .maybeSingle();
  if (error) return false;
  return parseOperatorGlobalSettingsDbEnabled(data?.value);
}
