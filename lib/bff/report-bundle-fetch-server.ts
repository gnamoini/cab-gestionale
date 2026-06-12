import "server-only";

import { cache } from "react";
import { enrichLavorazioneListRowsWithMezzi, mezziRowsToIdMap } from "@/lib/db/dto-mappers";
import { getLavorazioniReportLightServer } from "@/lib/lavorazioni/lavorazioni-list-fetch-server";
import { getMagazzinoReportLightServer } from "@/lib/magazzino/magazzino-list-fetch-server";
import { getMezziReportLightServer } from "@/lib/mezzi/mezzi-list-fetch-server";
import { getMovimentiListServer } from "@/lib/movimenti/movimenti-list-fetch-server";
import { getReportManualEntriesServer } from "@/lib/report/report-manual-entries-fetch-server";
import { getAppSettingsPayloadReadServer } from "@/lib/app-settings/app-settings-fetch-server";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MagazzinoRicambioRow, MezzoRow, MovimentoRicambioRow } from "@/src/types/supabase-tables";
import { resolveCabAppSettingsFallbackServer } from "@/lib/app-settings/settings-fallback-server";
import type { ReportManualEntryRow } from "@/src/types/supabase-tables";
import type { CabAppSettingsQueryPayload } from "@/src/hooks/gestionale/use-settings-queries";

export type ReportDataDTO = {
  lavorazioni: LavorazioneListRow[];
  magazzino: MagazzinoRicambioRow[];
  mezzi: MezzoRow[];
  movimenti: MovimentoRicambioRow[];
  manualEntries: ReportManualEntryRow[];
  settings: CabAppSettingsQueryPayload;
};

/**
 * BFF Report — 6 fetch parallele + join lavorazioni↔mezzi lato server (elimina client enrich gate).
 */
export const fetchReportDataDTOServer = cache(async (): Promise<ReportDataDTO> => {
  const [lavRes, magRes, mezziRes, movRes, manualRes, settingsRes] = await Promise.all([
    getLavorazioniReportLightServer(),
    getMagazzinoReportLightServer(),
    getMezziReportLightServer(),
    getMovimentiListServer(),
    getReportManualEntriesServer(),
    getAppSettingsPayloadReadServer(),
  ]);

  const mezziRows = mezziRes.success ? (mezziRes.data ?? []) : [];
  const mezziById = mezziRowsToIdMap(mezziRows);
  const lavRows = lavRes.success ? (lavRes.data ?? []) : [];
  const lavorazioni = enrichLavorazioneListRowsWithMezzi(lavRows, mezziById);

  return {
    lavorazioni,
    magazzino: magRes.success ? (magRes.data ?? []) : [],
    mezzi: mezziRows,
    movimenti: movRes.success ? (movRes.data ?? []) : [],
    manualEntries: manualRes.success ? (manualRes.data ?? []) : [],
    settings: settingsRes.success
      ? (settingsRes.data ?? { rows: [], resolved: resolveCabAppSettingsFallbackServer() })
      : { rows: [], resolved: resolveCabAppSettingsFallbackServer() },
  };
});
