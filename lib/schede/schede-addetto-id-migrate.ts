import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { findAddettoByStoredName } from "@/lib/lavorazioni/addetto-model";

/** Runtime backfill: tenta match stringa legacy → addettoId senza modificare la stringa. */
export function backfillAddettoIdFromLegacyString(
  records: readonly AddettoRecord[] | undefined,
  legacy: string | null | undefined,
  existingId?: string | null,
): string | null {
  const id = existingId?.trim();
  if (id) return id;
  const stored = legacy?.trim();
  if (!stored || stored === "—" || !records?.length) return null;
  return findAddettoByStoredName(records, stored)?.id ?? null;
}

export function normalizeIngressoAddettoIds(
  campi: Record<string, unknown>,
  records?: readonly AddettoRecord[],
): Record<string, unknown> {
  const c = { ...campi };
  const backfilled = backfillAddettoIdFromLegacyString(
    records,
    typeof c.addettoAccettazione === "string" ? c.addettoAccettazione : "",
    typeof c.addettoAccettazioneId === "string" ? c.addettoAccettazioneId : null,
  );
  if (backfilled && !c.addettoAccettazioneId) {
    c.addettoAccettazioneId = backfilled;
  }
  return c;
}

export function normalizeRigaAddettoOreIds(
  entry: Record<string, unknown>,
  records?: readonly AddettoRecord[],
): Record<string, unknown> {
  const e = { ...entry };
  const backfilled = backfillAddettoIdFromLegacyString(
    records,
    typeof e.addetto === "string" ? e.addetto : "",
    typeof e.addettoId === "string" ? e.addettoId : null,
  );
  if (backfilled && !e.addettoId) {
    e.addettoId = backfilled;
  }
  return e;
}
