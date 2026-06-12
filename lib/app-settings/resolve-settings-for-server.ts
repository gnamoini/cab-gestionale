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

/** Stati lavorazioni per sanitize lista server-side (no runtime client cache). */
export const resolveLavorazioniStatiForServer = cache(async (): Promise<StatoLavorazioneConfig[]> => {
  const resolved = await resolveCabAppSettingsResolvedServer();
  return resolved.lavorazioni.stati;
});

/** Impostazioni risolte da DB sessione server — fallback se non autenticato. */
export const resolveCabAppSettingsResolvedServer = cache(async (): Promise<CabAppSettingsResolved> => {
  try {
    const sb = await createSupabaseServerUserClient();
    const { data, error } = await sb
      .from("app_settings")
      .select(APP_SETTINGS_COLUMNS)
      .order("module", { ascending: true })
      .order("key", { ascending: true });
    if (error || !data?.length) return resolveCabAppSettingsFallbackServer();
    return resolveCabAppSettingsFromRows(data as AppSettingRow[], null);
  } catch {
    return resolveCabAppSettingsFallbackServer();
  }
});
