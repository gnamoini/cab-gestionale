import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { findAddettoByStoredName } from "@/lib/lavorazioni/addetto-model";
import type { SchedaIngressoFields } from "@/types/schede";

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

/** Default addetto per create: id esistente, backfill legacy, oppure primo record. */
export function resolveIngressoAddettoIdForCreate(
  records: readonly AddettoRecord[],
  fields: Pick<SchedaIngressoFields, "addettoAccettazioneId" | "addettoAccettazione">,
): string | null {
  const existing = fields.addettoAccettazioneId?.trim();
  if (existing && records.some((r) => r.id === existing)) return existing;
  const backfilled = backfillAddettoIdFromLegacyString(records, fields.addettoAccettazione, existing);
  if (backfilled) return backfilled;
  return records[0]?.id ?? null;
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
