import { costoUnitarioAcquistoRicambio, resolvePreventivoRigaRicambioCostoUnitario } from "@/lib/preventivi/preventivo-ricambio-costo";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { PreventivoRigaRicambio } from "@/lib/preventivi/types";

export type PreventivoRicambioMarkupSource = "magazzino" | "calcolato" | null;

export { resolvePreventivoRigaRicambioCostoUnitario };

/** Markup % — da magazzino/scheda se salvato, altrimenti da prezzo e costo riga. */
export function resolvePreventivoRigaRicambioMarkup(
  r: PreventivoRigaRicambio,
  magazzino?: RicambioMagazzino | null,
): { percent: number | null; source: PreventivoRicambioMarkupSource } {
  const prezzo = Math.max(0, Number(r.prezzoUnitario) || 0);
  const markupMag = magazzino?.markupPercentuale;
  if (magazzino && markupMag != null && Number.isFinite(markupMag) && markupMag > 0) {
    return { percent: Math.round(markupMag * 10) / 10, source: "magazzino" };
  }
  const costo = resolvePreventivoRigaRicambioCostoUnitario(r, magazzino);
  if (costo > 0 && prezzo > 0) {
    const pct = Math.round(((prezzo - costo) / costo) * 1000) / 10;
    return { percent: pct, source: "calcolato" };
  }
  return { percent: null, source: null };
}

export function fmtPreventivoMarkupPercent(value: number): string {
  return `${value.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}
