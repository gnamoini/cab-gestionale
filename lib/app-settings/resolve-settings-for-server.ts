import "server-only";

import { cache } from "react";
import { APP_SETTINGS_COLUMNS } from "@/lib/db/table-select-columns";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import {
  resolveCabAppSettingsFromRows,
  type CabAppSettingsResolved,
} from "@/src/lib/app-settings/resolve-from-rows";
import { resolveCabAppSettingsFallbackServer } from "@/lib/app-settings/settings-fallback-server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { AppSettingRow } from "@/src/types/supabase-tables";
import type { CabAppSettingsQueryPayload } from "@/src/hooks/gestionale/use-settings-queries";

/** SSOT: una sola lettura `app_settings` per request RSC (condivisa da BFF e sanitize lav). */
export const fetchCabAppSettingsPayloadServer = cache(async (): Promise<CabAppSettingsQueryPayload> => {
  try {
    const sb = await createSupabaseServerUserClient();
    const { data, error } = await sb
      .from("app_settings")
      .select(APP_SETTINGS_COLUMNS)
      .order("module", { ascending: true })
      .order("key", { ascending: true });
    if (error || !data?.length) {
      return { rows: [], resolved: resolveCabAppSettingsFallbackServer() };
    }
    const rows = data as AppSettingRow[];
    return { rows, resolved: resolveCabAppSettingsFromRows(rows, null) };
  } catch {
    return { rows: [], resolved: resolveCabAppSettingsFallbackServer() };
  }
});

/** Stati lavorazioni per sanitize lista server-side (no runtime client cache). */
export const resolveLavorazioniStatiForServer = cache(async (): Promise<StatoLavorazioneConfig[]> => {
  const payload = await fetchCabAppSettingsPayloadServer();
  return payload.resolved.lavorazioni.stati;
});

/** Impostazioni risolte da DB sessione server — fallback se non autenticato. */
export const resolveCabAppSettingsResolvedServer = cache(async (): Promise<CabAppSettingsResolved> => {
  const payload = await fetchCabAppSettingsPayloadServer();
  return payload.resolved;
});
