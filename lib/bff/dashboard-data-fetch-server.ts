import "server-only";

import { cache } from "react";
import { getLavorazioniAttiveLightServer } from "@/lib/lavorazioni/lavorazioni-list-fetch-server";
import { getMagazzinoReportLightServer } from "@/lib/magazzino/magazzino-list-fetch-server";
import { getAppSettingsPayloadReadServer } from "@/lib/app-settings/app-settings-fetch-server";
import { fetchSchedeBundlesStoreServer } from "@/lib/schede/schede-bundles-fetch-server";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import { resolveCabAppSettingsFallbackServer } from "@/lib/app-settings/settings-fallback-server";
import type { CabAppSettingsQueryPayload } from "@/src/hooks/gestionale/use-settings-queries";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type DashboardDataDTO = {
  lavorazioni: LavorazioneListRow[];
  schedeStore: LavorazioneSchedeStore;
  magazzinoReport: MagazzinoRicambioRow[];
  settings: CabAppSettingsQueryPayload;
};

function codiciMapFromRows(rows: readonly LavorazioneListRow[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const row of rows) out[row.id] = row.codice ?? null;
  return out;
}

/**
 * BFF Dashboard — wave 1: lav ∥ mag ∥ settings; wave 2: schede batch (1–⌈N/80⌉ query).
 */
export const fetchDashboardDataDTOServer = cache(async (): Promise<DashboardDataDTO> => {
  const [lavRes, magRes, settingsRes] = await Promise.all([
    getLavorazioniAttiveLightServer(),
    getMagazzinoReportLightServer(),
    getAppSettingsPayloadReadServer(),
  ]);

  const lavorazioni = lavRes.success ? (lavRes.data ?? []) : [];
  const ids = lavorazioni.map((r) => r.id);
  const schedeRes = ids.length
    ? await fetchSchedeBundlesStoreServer(ids, codiciMapFromRows(lavorazioni))
    : { success: true as const, data: {} as LavorazioneSchedeStore };

  return {
    lavorazioni,
    schedeStore: schedeRes.success ? (schedeRes.data ?? {}) : {},
    magazzinoReport: magRes.success ? (magRes.data ?? []) : [],
    settings: settingsRes.success
      ? (settingsRes.data ?? { rows: [], resolved: resolveCabAppSettingsFallbackServer() })
      : { rows: [], resolved: resolveCabAppSettingsFallbackServer() },
  };
});
