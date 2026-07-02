import "server-only";

import { cache } from "react";
import {
  MEZZO_ATTREZZATURE_V2_KEY,
  MEZZO_ATTREZZATURE_V2_MODULE,
  isMezzoAttrezzatureV2Enabled,
  parseMezzoAttrezzatureV2DbEnabled,
} from "@/lib/officina/mezzo-attrezzature-v2-flag";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

/** Flag DB da `app_settings` — dedupe per request RSC. */
export const fetchMezzoAttrezzatureV2DbEnabledServer = cache(async (): Promise<boolean> => {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("app_settings")
    .select("value")
    .eq("module", MEZZO_ATTREZZATURE_V2_MODULE)
    .eq("key", MEZZO_ATTREZZATURE_V2_KEY)
    .maybeSingle();
  if (error) return false;
  return parseMezzoAttrezzatureV2DbEnabled(data?.value);
});

/** Env + DB — uso in layout / server actions / guard. */
export async function resolveAttrezzatureV2EnabledServer(): Promise<boolean> {
  const dbEnabled = await fetchMezzoAttrezzatureV2DbEnabledServer();
  return isMezzoAttrezzatureV2Enabled(dbEnabled);
}
