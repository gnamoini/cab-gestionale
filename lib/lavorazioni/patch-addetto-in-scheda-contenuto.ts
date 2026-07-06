import { dbTipoToBundleKey } from "@/lib/schede/scheda-tipo-db-mapper";

function schedaDocFromContenuto(contenuto: unknown): Record<string, unknown> | null {
  if (!contenuto || typeof contenuto !== "object" || Array.isArray(contenuto)) return null;
  const c = contenuto as Record<string, unknown>;
  if ("doc" in c && c.doc && typeof c.doc === "object" && !Array.isArray(c.doc)) {
    return c.doc as Record<string, unknown>;
  }
  return c;
}

function wrapContenuto(contenuto: unknown, doc: Record<string, unknown>): Record<string, unknown> {
  if (!contenuto || typeof contenuto !== "object" || Array.isArray(contenuto)) {
    return doc;
  }
  const c = contenuto as Record<string, unknown>;
  if ("doc" in c && c.doc && typeof c.doc === "object" && !Array.isArray(c.doc)) {
    return { ...c, doc };
  }
  return doc;
}

function patchStringField(
  campi: Record<string, unknown>,
  key: string,
  fromValues: readonly string[],
  to: string,
): { campi: Record<string, unknown>; changed: boolean } {
  const current = campi[key];
  if (typeof current !== "string") return { campi, changed: false };
  const trimmed = current.trim();
  if (!fromValues.some((f) => f.trim() === trimmed)) return { campi, changed: false };
  return { campi: { ...campi, [key]: to }, changed: true };
}

/** Propaga rinomina addetto nel contenuto DB di una scheda (ingresso / lavorazioni). */
export function patchAddettoInSchedaContenuto(
  tipo: string,
  contenuto: unknown,
  fromValues: readonly string[],
  to: string,
): { next: Record<string, unknown>; changed: boolean } {
  const bundleKey = dbTipoToBundleKey(tipo);
  const doc = schedaDocFromContenuto(contenuto);
  if (!doc) return { next: (contenuto as Record<string, unknown>) ?? {}, changed: false };

  const campi = doc.campi;
  if (!campi || typeof campi !== "object" || Array.isArray(campi)) {
    return { next: (contenuto as Record<string, unknown>) ?? {}, changed: false };
  }
  const c = { ...(campi as Record<string, unknown>) };
  let changed = false;

  if (bundleKey === "ingresso") {
    const patched = patchStringField(c, "addettoAccettazione", fromValues, to);
    if (!patched.changed) return { next: (contenuto as Record<string, unknown>) ?? {}, changed: false };
    return { next: wrapContenuto(contenuto, { ...doc, campi: patched.campi }), changed: true };
  }

  if (bundleKey === "lavorazioni") {
    const righe = c.righe;
    if (!Array.isArray(righe)) return { next: (contenuto as Record<string, unknown>) ?? {}, changed: false };
    const nextRighe = righe.map((riga) => {
      if (!riga || typeof riga !== "object" || Array.isArray(riga)) return riga;
      const r = riga as Record<string, unknown>;
      const addettiAssegnati = r.addettiAssegnati;
      if (!Array.isArray(addettiAssegnati)) return riga;
      let rowChanged = false;
      const nextAddetti = addettiAssegnati.map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
        const e = entry as Record<string, unknown>;
        const addetto = e.addetto;
        if (typeof addetto === "string" && fromValues.some((f) => f.trim() === addetto.trim())) {
          rowChanged = true;
          return { ...e, addetto: to };
        }
        return entry;
      });
      if (!rowChanged) return riga;
      changed = true;
      return { ...r, addettiAssegnati: nextAddetti };
    });
    if (!changed) return { next: (contenuto as Record<string, unknown>) ?? {}, changed: false };
    return { next: wrapContenuto(contenuto, { ...doc, campi: { ...c, righe: nextRighe } }), changed: true };
  }

  return { next: (contenuto as Record<string, unknown>) ?? {}, changed: false };
}

/** Wrapper legacy: singolo valore `from`. */
export function patchAddettoNomeInSchedaContenuto(
  tipo: string,
  contenuto: unknown,
  from: string,
  to: string,
): { next: Record<string, unknown>; changed: boolean } {
  return patchAddettoInSchedaContenuto(tipo, contenuto, [from], to);
}
