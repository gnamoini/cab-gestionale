import "server-only";

import { cache } from "react";
import { fetchCabAppSettingsPayloadServer } from "@/lib/app-settings/resolve-settings-for-server";
import { verifyServerPermission } from "@/src/lib/auth/server-permission-guards";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { CabAppSettingsQueryPayload } from "@/src/hooks/gestionale/use-settings-queries";

async function fetchAppSettingsPayloadRows(): Promise<ServiceResult<CabAppSettingsQueryPayload>> {
  try {
    return success(await fetchCabAppSettingsPayloadServer());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore impostazioni";
    return err(msg);
  }
}

/** Lettura settings per hydrate liste (RLS sessione). */
export const getAppSettingsPayloadReadServer = cache(fetchAppSettingsPayloadRows);

/** Impostazioni admin — gate `manageSettings` prima del prefetch. */
export const getAppSettingsPayloadServer = cache(async (): Promise<ServiceResult<CabAppSettingsQueryPayload>> => {
  const allowed = await verifyServerPermission("manageSettings");
  if (!allowed) return err("Permesso richiesto.");
  return fetchAppSettingsPayloadRows();
});
