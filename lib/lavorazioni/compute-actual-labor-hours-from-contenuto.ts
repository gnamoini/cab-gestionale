import type { SchedaLavorazioniDoc } from "@/types/schede";

/** Estrae doc da wrapper `{ doc }` o contenuto diretto. */
export function unwrapSchedaContenutoDoc(contenuto: Record<string, unknown>): Record<string, unknown> {
  const nested = contenuto.doc;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return contenuto;
}

/**
 * Somma oreImpiegate da contenuto scheda interventi (tipo DB `interventi`).
 * Allineato a `cab_compute_actual_labor_hours` SQL e `oreTotaliFromBundleLavorazioni`.
 */
export function computeActualLaborHoursFromContenuto(contenuto: Record<string, unknown>): number {
  const doc = unwrapSchedaContenutoDoc(contenuto);
  if (doc.tipo !== "lavorazioni") return 0;
  const campi = doc.campi;
  if (!campi || typeof campi !== "object" || Array.isArray(campi)) return 0;
  const righe = (campi as { righe?: unknown }).righe;
  if (!Array.isArray(righe)) return 0;

  let sum = 0;
  for (const riga of righe) {
    if (!riga || typeof riga !== "object") continue;
    const addetti = (riga as { addettiAssegnati?: unknown }).addettiAssegnati;
    if (!Array.isArray(addetti)) continue;
    for (const a of addetti) {
      if (!a || typeof a !== "object") continue;
      const ore = Number((a as { oreImpiegate?: unknown }).oreImpiegate);
      if (Number.isFinite(ore) && ore >= 0) sum += ore;
    }
  }
  return Math.round(sum * 100) / 100;
}

/** Da doc scheda lavorazioni tipizzato (bundle path). */
export function computeActualLaborHoursFromLavorazioniDoc(doc: SchedaLavorazioniDoc | null | undefined): number {
  if (!doc || doc.tipo !== "lavorazioni") return 0;
  let sum = 0;
  for (const riga of doc.campi.righe ?? []) {
    for (const a of riga.addettiAssegnati ?? []) {
      sum += Number.isFinite(a.oreImpiegate) && a.oreImpiegate >= 0 ? a.oreImpiegate : 0;
    }
  }
  return Math.round(sum * 100) / 100;
}
