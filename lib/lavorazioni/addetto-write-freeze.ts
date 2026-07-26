/**
 * SSOT write policy: nuovi record persistono solo `*Id`; stringhe legacy read-only.
 */

export type AddettoWriteFreezeField = {
  /** Campo id write (es. addettoId, addettoAccettazioneId). */
  idField: string;
  /** Campi stringa legacy da rimuovere quando id è valorizzato. */
  legacyFields: readonly string[];
};

/** Rimuove campi legacy stringa se l'id corrispondente è presente (no dual-write). */
export function stripAddettoLegacyFieldsOnWrite<T extends Record<string, unknown>>(
  obj: T,
  rules: readonly AddettoWriteFreezeField[],
): T {
  const out = { ...obj };
  for (const { idField, legacyFields } of rules) {
    const id = out[idField];
    if (typeof id === "string" && id.trim()) {
      for (const legacy of legacyFields) {
        if (legacy in out) delete out[legacy];
      }
    }
  }
  return out;
}

export const SCHEDA_INGRESSO_ADDETTO_WRITE_RULES: readonly AddettoWriteFreezeField[] = [
  { idField: "addettoAccettazioneId", legacyFields: ["addettoAccettazione"] },
];

export const SCHEDA_RIGA_ADDETTO_WRITE_RULES: readonly AddettoWriteFreezeField[] = [
  { idField: "addettoId", legacyFields: ["addetto"] },
];

export const PREVENTIVO_RIGA_ADDETTO_WRITE_RULES: readonly AddettoWriteFreezeField[] = [
  { idField: "addettoId", legacyFields: ["addetto"] },
];

/** Normalizza riga addetto preventivo in uscita: solo id + ore (+ warning legacy opzionale). */
export function normalizePreventivoRigaAddettoWrite(raw: Record<string, unknown>): Record<string, unknown> {
  const addettoId = typeof raw.addettoId === "string" ? raw.addettoId.trim() : "";
  const ore = typeof raw.ore === "number" && Number.isFinite(raw.ore) ? raw.ore : Number(raw.ore) || 0;
  const legacyWarning =
    typeof raw.legacyWarning === "string" && raw.legacyWarning.trim() ? raw.legacyWarning.trim() : undefined;
  const addettoLegacy =
    typeof raw.addettoLegacy === "string" && raw.addettoLegacy.trim() ? raw.addettoLegacy.trim() : undefined;

  if (addettoId) {
    return { addettoId, ore };
  }
  const out: Record<string, unknown> = { addettoId: null, ore };
  if (legacyWarning) out.legacyWarning = legacyWarning;
  if (addettoLegacy) out.addettoLegacy = addettoLegacy;
  return out;
}
