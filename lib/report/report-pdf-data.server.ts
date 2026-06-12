import "server-only";

import { cache } from "react";
import { enrichLavorazioneListRowsWithMezzi, mezziRowsToIdMap } from "@/lib/db/dto-mappers";
import { getLavorazioniReportLightServer } from "@/lib/lavorazioni/lavorazioni-list-fetch-server";
import { getMagazzinoReportLightServer } from "@/lib/magazzino/magazzino-list-fetch-server";
import { getMezziReportLightServer } from "@/lib/mezzi/mezzi-list-fetch-server";
import { getMovimentiListServer } from "@/lib/movimenti/movimenti-list-fetch-server";

export type ReportPdfDataSnapshot = {
  generatedAt: string;
  lavorazioniCount: number;
  lavorazioniArchivioCount: number;
  magazzinoCount: number;
  mezziCount: number;
  movimentiCount: number;
  magazzinoGiacenzaTotale: number;
};

export const fetchReportPdfDataSnapshot = cache(async (): Promise<ReportPdfDataSnapshot> => {
  const [lavRes, magRes, mezziRes, movRes] = await Promise.all([
    getLavorazioniReportLightServer(),
    getMagazzinoReportLightServer(),
    getMezziReportLightServer(),
    getMovimentiListServer(),
  ]);

  const lavRows = lavRes.success ? (lavRes.data ?? []) : [];
  const mezziRows = mezziRes.success ? (mezziRes.data ?? []) : [];
  const mezziById = mezziRowsToIdMap(mezziRows);
  const enriched = enrichLavorazioneListRowsWithMezzi(lavRows, mezziById);
  const magRows = magRes.success ? (magRes.data ?? []) : [];
  const movRows = movRes.success ? (movRes.data ?? []) : [];

  const magazzinoGiacenzaTotale = magRows.reduce((acc, r) => acc + Number(r.quantita ?? 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    lavorazioniCount: enriched.filter((r) => r.archived !== true).length,
    lavorazioniArchivioCount: enriched.filter((r) => r.archived === true).length,
    magazzinoCount: magRows.length,
    mezziCount: mezziRows.length,
    movimentiCount: movRows.length,
    magazzinoGiacenzaTotale,
  };
});
