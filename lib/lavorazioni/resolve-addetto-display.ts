import { composeInterventoContextFromListRow } from "@/lib/domain/intervento-context";
import { latestAddettoFromLogs } from "@/lib/lavorazioni/client-portal-ui";
import {
  addettoRefFromFields,
  getAddettoColorKey,
  getAddettoDisplayLabel,
  getAddettoDisplayName,
  resolveAddettoRecord,
} from "@/lib/lavorazioni/addetto-display";
import {
  findAddettoById,
  findAddettoByStoredName,
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

function ingressoCampi(row: Pick<LavorazioneListRow, "id">, schedeStore: LavorazioneSchedeStore | undefined) {
  const store = schedeStore ?? {};
  return (
    store[row.id]?.ingresso?.campi ??
    composeInterventoContextFromListRow(row as LavorazioneListRow, store).schedaIngresso.campi
  );
}

/** Ref id-first da snapshot scheda (senza enrich settings). */
export function resolveAddettoSnapshotRef(
  row: Pick<LavorazioneListRow, "id">,
  schedeStore: LavorazioneSchedeStore | undefined,
  logs?: readonly LogModificaRow[],
): { addettoId: string | null; addettoLegacy: string | null } {
  const campi = ingressoCampi(row, schedeStore);
  const ingressoId = campi?.addettoAccettazioneId?.trim() || null;
  const ingressoLegacy = campi?.addettoAccettazione?.trim() || "";
  if (ingressoId || ingressoLegacy) {
    return { addettoId: ingressoId, addettoLegacy: ingressoId ? null : ingressoLegacy };
  }

  const store = schedeStore ?? {};
  const fromRighe =
    store[row.id]?.lavorazioni?.campi.righe
      .flatMap((r) => r.addettiAssegnati)
      .find((a) => a.addettoId?.trim() || a.addetto?.trim()) ?? null;
  if (fromRighe) {
    const id = fromRighe.addettoId?.trim() || null;
    const legacy = fromRighe.addetto?.trim() ?? "";
    return { addettoId: id, addettoLegacy: id ? null : legacy || null };
  }

  if (logs?.length) {
    const fromLogs = latestAddettoFromLogs(logs);
    if (fromLogs !== LAVORAZIONE_EMPTY_DISPLAY) {
      return { addettoId: null, addettoLegacy: fromLogs };
    }
  }
  return { addettoId: null, addettoLegacy: null };
}

/** Nome grezzo da snapshot scheda (senza enrich settings). */
export function resolveAddettoSnapshotRaw(
  row: Pick<LavorazioneListRow, "id">,
  schedeStore: LavorazioneSchedeStore | undefined,
  logs?: readonly LogModificaRow[],
): string {
  const ref = resolveAddettoSnapshotRef(row, schedeStore, logs);
  if (ref.addettoId && schedeStore) {
    return ref.addettoId;
  }
  return ref.addettoLegacy ?? "";
}

/** Chiave colore pill: id/colorKey stabile. */
export function resolveAddettoNomeKey(
  row: Pick<LavorazioneListRow, "id">,
  ctx: ResolveAddettoDisplayContext = {},
): string {
  const ref = resolveAddettoSnapshotRef(row, ctx.schedeStore, ctx.logs);
  return getAddettoColorKey(ctx.addettiRecords ?? [], ref);
}

/** @deprecated Usare resolveAddettoNomeKey → getAddettoColorKey */
export const resolveAddettoColorKey = resolveAddettoNomeKey;

/**
 * Resolver context-aware lavorazioni: snapshot → logs → empty.
 * Opzionale enrich da settings se match per id o legacy.
 */
export function resolveAddettoDisplay(
  row: Pick<LavorazioneListRow, "id">,
  ctx: ResolveAddettoDisplayContext = {},
): string {
  const ref = resolveAddettoSnapshotRef(row, ctx.schedeStore, ctx.logs);
  return getAddettoDisplayName(ctx.addettiRecords ?? [], ref);
}

/** Etichetta UI lista/PDF: empty → trattino. */
export function resolveAddettoDisplayLabel(
  row: Pick<LavorazioneListRow, "id">,
  ctx: ResolveAddettoDisplayContext = {},
): string {
  const ref = resolveAddettoSnapshotRef(row, ctx.schedeStore, ctx.logs);
  return getAddettoDisplayLabel(ctx.addettiRecords ?? [], ref);
}

/**
 * Per filtri/KPI: true solo con bundle scheda caricato e nessun addetto persistito.
 */
export function isLavorazioneAddettoUnassigned(
  row: Pick<LavorazioneListRow, "id">,
  ctx: ResolveAddettoDisplayContext = {},
): boolean {
  const store = ctx.schedeStore ?? {};
  if (!store[row.id]) return false;
  const ref = resolveAddettoSnapshotRef(row, ctx.schedeStore, ctx.logs);
  return !ref.addettoId && !ref.addettoLegacy?.trim();
}

export function resolveAddettoRecordFromRow(
  row: Pick<LavorazioneListRow, "id">,
  ctx: ResolveAddettoDisplayContext = {},
): AddettoRecord | null {
  const ref = resolveAddettoSnapshotRef(row, ctx.schedeStore, ctx.logs);
  return resolveAddettoRecord(ctx.addettiRecords ?? [], ref);
}

/** Helper per costruire AddettoRef da campi scheda. */
export { addettoRefFromFields };
