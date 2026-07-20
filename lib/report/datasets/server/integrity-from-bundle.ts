import "server-only";

import { mapMagazzinoRowsToUI } from "@/lib/magazzino/magazzino-list-cache";
import type { ReportDataDTO } from "@/lib/bff/report-bundle-fetch-server";
import { ReportDataIntegrityLayer } from "@/lib/report/report-data-integrity-layer";
import type { ReportIntegrityResult } from "@/lib/report/report-data-integrity-layer";

export function buildIntegrityFromReportDto(dto: ReportDataDTO): ReportIntegrityResult {
  const magazzino = mapMagazzinoRowsToUI(dto.magazzino, "Sistema");
  const lavorazioniArchivioRaw = dto.lavorazioni.filter((row) => row.archived === true);
  return ReportDataIntegrityLayer.buildValidatedDataset({
    lavorazioniRaw: dto.lavorazioni,
    lavorazioniArchivioRaw,
    magazzino,
    mezzi: [...dto.mezzi],
    movimenti: [...dto.movimenti],
    manualEntries: [...dto.manualEntries],
  });
}
