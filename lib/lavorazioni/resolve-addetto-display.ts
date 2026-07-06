import { composeInterventoContextFromListRow } from "@/lib/domain/intervento-context";
import { latestAddettoFromLogs } from "@/lib/lavorazioni/client-portal-ui";
import {
  addettoDisplayNameFromNome,
  type AddettoRecord,
} from "@/lib/lavorazioni/addetto-model";
import { LAVORAZIONE_EMPTY_DISPLAY } from "@/lib/lavorazioni/lavorazione-display-helpers";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type ResolveAddettoDisplayContext = {
  schedeStore?: LavorazioneSchedeStore;
  logs?: readonly LogModificaRow[];
  /** Solo arricchimento cognome; mai fallback su primo addetto attivo. */
  addettiRecords?: readonly AddettoRecord[];
};

/** Nome grezzo da snapshot scheda (senza enrich settings). */
export function resolveAddettoSnapshotRaw(
  row: Pick<LavorazioneListRow, "id">,
  schedeStore: LavorazioneSchedeStore | undefined,
  logs?: readonly LogModificaRow[],
): string {
  const store = schedeStore ?? {};
  const fromIngresso =
    store[row.id]?.ingresso?.campi?.addettoAccettazione?.trim() ||
    composeInterventoContextFromListRow(row as LavorazioneListRow, store).schedaIngresso.campi
      ?.addettoAccettazione?.trim() ||
    "";
  const fromRighe =
    store[row.id]?.lavorazioni?.campi.righe
      .flatMap((r) => r.addettiAssegnati)
      .find((a) => a.addetto.trim())
      ?.addetto.trim() ?? "";
  if (fromIngresso || fromRighe) return fromIngresso || fromRighe;
  if (logs?.length) {
    const fromLogs = latestAddettoFromLogs(logs);
    if (fromLogs !== LAVORAZIONE_EMPTY_DISPLAY) return fromLogs;
  }
  return "";
}

/**
 * Resolver context-aware lavorazioni: snapshot → logs → empty.
 * Opzionale enrich da settings se match per nome (mai addetti[0]).
 */
export function resolveAddettoDisplay(
  row: Pick<LavorazioneListRow, "id">,
  ctx: ResolveAddettoDisplayContext = {},
): string {
  const raw = resolveAddettoSnapshotRaw(row, ctx.schedeStore, ctx.logs);
  if (!raw) return "";
  if (ctx.addettiRecords?.length) {
    return addettoDisplayNameFromNome(ctx.addettiRecords, raw);
  }
  return raw;
}

/** Etichetta UI lista/PDF: empty → trattino. */
export function resolveAddettoDisplayLabel(
  row: Pick<LavorazioneListRow, "id">,
  ctx: ResolveAddettoDisplayContext = {},
): string {
  const label = resolveAddettoDisplay(row, ctx);
  return label.trim() || LAVORAZIONE_EMPTY_DISPLAY;
}

/** Per filtri/KPI: true se nessun addetto assegnato (no ghost fallback). */
export function isLavorazioneAddettoUnassigned(
  row: Pick<LavorazioneListRow, "id">,
  ctx: ResolveAddettoDisplayContext = {},
): boolean {
  return !resolveAddettoSnapshotRaw(row, ctx.schedeStore, ctx.logs).trim();
}
