import "server-only";

import { cache } from "react";
import { APP_SETTINGS_COLUMNS } from "@/lib/db/table-select-columns";
import { verifyServerPermission } from "@/src/lib/auth/server-permission-guards";
import { resolveCabAppSettingsFromRows } from "@/src/lib/app-settings/resolve-from-rows";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { AppSettingRow } from "@/src/types/supabase-tables";
import type { CabAppSettingsQueryPayload } from "@/src/hooks/gestionale/use-settings-queries";

async function fetchAppSettingsPayloadRows(): Promise<ServiceResult<CabAppSettingsQueryPayload>> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("app_settings")
    .select(APP_SETTINGS_COLUMNS)
    .order("module", { ascending: true })
    .order("key", { ascending: true });
  if (error) return err(error.message);
  const rows = (data ?? []) as AppSettingRow[];
  return success({ rows, resolved: resolveCabAppSettingsFromRows(rows, null) });
}

/** Lettura settings per hydrate liste (RLS sessione). */
export const getAppSettingsPayloadReadServer = cache(fetchAppSettingsPayloadRows);

/** Impostazioni admin — gate `manageSettings` prima del prefetch. */
export const getAppSettingsPayloadServer = cache(async (): Promise<ServiceResult<CabAppSettingsQueryPayload>> => {
  const allowed = await verifyServerPermission("manageSettings");
  if (!allowed) return err("Permesso richiesto.");
  return fetchAppSettingsPayloadRows();
});
