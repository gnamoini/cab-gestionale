import { composeInterventoContextFromListRow } from "@/lib/domain/intervento-context/build-intervento-context";
import { resolveInterventoOggettoDisplay } from "@/lib/domain/mezzo-attrezzatura/intervento-oggetto-display";
import { formatIdentificazionePdfCell } from "@/lib/lavorazioni/lavorazioni-pdf-format";
import { lavorazioneAddettoLabel } from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import { prioritaLabel } from "@/lib/lavorazioni/lavorazioni-pill-styles";
import { statoLavorazioneLabel } from "@/lib/lavorazioni/stati-dynamic";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LavorazioniInCorsoPdfRow } from "@/lib/lavorazioni/lavorazioni-list-pdf";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

/** Bump quando cambia la logica di mapping (invalida cache storage artifact). */
export const LAVORAZIONI_IN_CORSO_PDF_MAP_VERSION = 3;

export type LavorazioniPdfMapContext = {
  stati: readonly StatoLavorazioneConfig[];
  schedeStore: LavorazioneSchedeStore;
  addettiRecords?: readonly AddettoRecord[];
};

function mezzoLabel(row: LavorazioneListRow): string {
  const ctx = composeInterventoContextFromListRow(row);
  return resolveInterventoOggettoDisplay(ctx).label.trim() || "—";
}

function clienteFromRow(row: LavorazioneListRow): string {
  return (row.mezzo?.cliente ?? "").trim() || "—";
}

function displayOrDash(v: string): string {
  const t = v.trim();
  return t || "—";
}

/** Mappa righe LIGHT server → modello PDF lista in corso (label allineate alla tabella UI). */
export function mapLavorazioniListRowsToPdfRows(
  rows: readonly LavorazioneListRow[],
  ctx: LavorazioniPdfMapContext,
): LavorazioniInCorsoPdfRow[] {
  return rows.map((row) => {
    const m = row.mezzo;
    return {
      cliente: clienteFromRow(row),
      attrezzatura: mezzoLabel(row),
      identificazione: formatIdentificazionePdfCell(m?.targa ?? "", m?.matricola ?? "", m?.numero_scuderia ?? ""),
      stato: displayOrDash(statoLavorazioneLabel(row.stato ?? "", [...ctx.stati])),
      priorita: displayOrDash(prioritaLabel(row.priorita ?? "")),
      prioritaSortKey: row.priorita ?? "",
      addetto: lavorazioneAddettoLabel(row, ctx.schedeStore, undefined, ctx.addettiRecords),
    };
  });
}
