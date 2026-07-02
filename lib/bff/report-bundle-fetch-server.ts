import "server-only";

import { cache } from "react";
import { enrichLavorazioneListRowsWithMezzi } from "@/lib/db/dto-mappers";
import { mezziGestitiToEmbedMap } from "@/lib/mezzi/mezzi-attrezzature-batch";
import { getLavorazioniReportLightServer } from "@/lib/lavorazioni/lavorazioni-list-fetch-server";
import { getMagazzinoReportLightServer } from "@/lib/magazzino/magazzino-list-fetch-server";
import { getMezziReportLightServer } from "@/lib/mezzi/mezzi-list-fetch-server";
import { getMovimentiListServer } from "@/lib/movimenti/movimenti-list-fetch-server";
import { getReportManualEntriesServer } from "@/lib/report/report-manual-entries-fetch-server";
import { getAppSettingsPayloadReadServer } from "@/lib/app-settings/app-settings-fetch-server";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MagazzinoRicambioRow, MovimentoRicambioRow, ReportManualEntryRow } from "@/src/types/supabase-tables";
import { resolveCabAppSettingsFallbackServer } from "@/lib/app-settings/settings-fallback-server";

import type { CabAppSettingsQueryPayload } from "@/src/hooks/gestionale/use-settings-queries";

export type ReportDataDTO = {
  lavorazioni: LavorazioneListRow[];
  magazzino: MagazzinoRicambioRow[];
  mezzi: MezzoGestito[];
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

  const mezziGestiti = mezziRes.success ? (mezziRes.data ?? []) : [];
  const mezziById = mezziGestitiToEmbedMap(mezziGestiti);
  const lavRows = lavRes.success ? (lavRes.data ?? []) : [];
  const lavorazioni = enrichLavorazioneListRowsWithMezzi(lavRows, mezziById);

  return {
    lavorazioni,
    magazzino: magRes.success ? (magRes.data ?? []) : [],
    mezzi: mezziGestiti,
    movimenti: movRes.success ? (movRes.data ?? []) : [],
    manualEntries: manualRes.success ? (manualRes.data ?? []) : [],
    settings: settingsRes.success
      ? (settingsRes.data ?? { rows: [], resolved: resolveCabAppSettingsFallbackServer() })
      : { rows: [], resolved: resolveCabAppSettingsFallbackServer() },
  };
});
