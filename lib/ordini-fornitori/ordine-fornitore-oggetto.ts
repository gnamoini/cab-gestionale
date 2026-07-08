export const ORDINE_FORNITORE_META_OGGETTO = "oggettoOrdine";

export function readOrdineOggetto(meta: Record<string, unknown> | undefined): string {
  const v = meta?.[ORDINE_FORNITORE_META_OGGETTO];
  return typeof v === "string" ? v : "";
}

export function ordineMetaWithOggetto(
  meta: Record<string, unknown> | undefined,
  oggettoOrdine: string,
): Record<string, unknown> {
  const next = { ...(meta ?? {}) };
  const trimmed = oggettoOrdine.trim();
  if (trimmed) next[ORDINE_FORNITORE_META_OGGETTO] = trimmed;
  else delete next[ORDINE_FORNITORE_META_OGGETTO];
  return next;
}

export function ordineRecordWithOggetto<T extends { meta: Record<string, unknown>; oggettoOrdine: string }>(
  record: T,
  oggettoOrdine: string,
): T {
  return {
    ...record,
    oggettoOrdine,
    meta: ordineMetaWithOggetto(record.meta, oggettoOrdine),
  };
}
