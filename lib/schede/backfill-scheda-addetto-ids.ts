/**
 * ponytail: backfill one-shot — aggiunge addettoId senza modificare stringhe legacy.
 * Eseguire via script/admin; non invocare in hot path UI.
 */
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import {
  backfillAddettoIdFromLegacyString,
  normalizeIngressoAddettoIds,
  normalizeRigaAddettoOreIds,
} from "@/lib/schede/schede-addetto-id-migrate";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

/** Backfill contenuto scheda_lavorazione (JSON doc wrapper o flat). */
export function backfillAddettoIdsInSchedaContenuto(
  contenuto: unknown,
  tipo: "ingresso" | "lavorazioni" | "ricambi",
  addettiRecords: readonly AddettoRecord[],
): { next: Record<string, unknown>; changed: boolean } {
  if (!isRecord(contenuto)) return { next: {}, changed: false };
  const doc =
    isRecord(contenuto.doc) ? (contenuto.doc as Record<string, unknown>) : contenuto;
  const campi = doc.campi;
  if (!isRecord(campi)) return { next: contenuto as Record<string, unknown>, changed: false };

  let changed = false;
  const c = { ...campi };

  if (tipo === "ingresso") {
    const before = JSON.stringify(c);
    const normalized = normalizeIngressoAddettoIds(c, addettiRecords);
    if (JSON.stringify(normalized) !== before) changed = true;
    Object.assign(c, normalized);
  }

  if (tipo === "lavorazioni" && Array.isArray(c.righe)) {
    c.righe = c.righe.map((riga) => {
      if (!isRecord(riga)) return riga;
      const r = { ...riga };
      const addetti = r.addettiAssegnati;
      if (!Array.isArray(addetti)) return riga;
      const nextAddetti = addetti.map((a) => {
        if (!isRecord(a)) return a;
        const normalized = normalizeRigaAddettoOreIds(a, addettiRecords);
        if (normalized.addettoId && !a.addettoId) changed = true;
        return normalized;
      });
      return { ...r, addettiAssegnati: nextAddetti };
    });
  }

  if (tipo === "ricambi" && Array.isArray(c.righe)) {
    c.righe = c.righe.map((riga) => {
      if (!isRecord(riga)) return riga;
      const legacy = typeof riga.addetto === "string" ? riga.addetto : "";
      const id = backfillAddettoIdFromLegacyString(
        addettiRecords,
        legacy,
        typeof riga.addettoId === "string" ? riga.addettoId : null,
      );
      if (id && !riga.addettoId) {
        changed = true;
        return { ...riga, addettoId: id };
      }
      return riga;
    });
  }

  const nextDoc = { ...doc, campi: c };
  const next =
    isRecord(contenuto.doc) ? { ...contenuto, doc: nextDoc } : (nextDoc as Record<string, unknown>);
  return { next, changed };
}
