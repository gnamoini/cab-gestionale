import type { RicambioFornitoreAlternativo, RicambioMagazzino } from "@/lib/magazzino/types";

type FornitorePrezzoRow = Pick<RicambioFornitoreAlternativo, "prezzo" | "sconto">;

/**
 * Base lorda per markup % e prezzo vendita.
 * Listino OE se presente; altrimenti prezzo del fornitore alternativo con costo netto più alto.
 */
export function resolveListinoMarkupBase(
  listinoOE: number,
  fornitoriAlternativi: readonly FornitorePrezzoRow[],
): number {
  const listino = Math.max(0, Number(listinoOE));
  if (listino > 0) return listino;

  let bestPrezzo = 0;
  let bestNetto = -1;
  for (const row of fornitoriAlternativi) {
    const prezzo = Math.max(0, Number(row.prezzo));
    if (prezzo <= 0) continue;
    const netto = prezzoNetto(prezzo, row.sconto ?? 0);
    if (netto > bestNetto || (netto === bestNetto && prezzo > bestPrezzo)) {
      bestNetto = netto;
      bestPrezzo = prezzo;
    }
  }
  return bestPrezzo;
}

/** Prezzo vendita da listino fornitore originale e markup % (IVA esclusa, arrotondato centesimi). */
export function prezzoVenditaDaListinoEMarkup(listino: number, markupPercentuale: number): number {
  const l = Number(listino);
  const m = Number(markupPercentuale);
  if (!Number.isFinite(l)) return 0;
  if (!Number.isFinite(m)) return Math.round(l * 100) / 100;
  const v = l + (l * m) / 100;
  return Math.round(v * 100) / 100;
}

export function prezzoNetto(prezzo: number, scontoPercent: number): number {
  const p = Number(prezzo);
  const s = Number(scontoPercent);
  if (!Number.isFinite(p)) return 0;
  if (!Number.isFinite(s) || s <= 0) return Math.round(p * 100) / 100;
  const net = p - (p * s) / 100;
  return Math.round(net * 100) / 100;
}

export function prezzoNettoFornitoreOriginale(r: RicambioMagazzino): number {
  return prezzoNetto(r.prezzoFornitoreOriginale, r.scontoFornitoreOriginale);
}

export function prezzoNettoFornitoreNonOriginale(r: RicambioMagazzino): number {
  return prezzoNetto(r.prezzoFornitoreNonOriginale, r.scontoFornitoreNonOriginale);
}

/** Capitale immobilizzato: listino fornitore originale × giacenza (come da specifica). */
export function capitaleImmobilizzato(r: RicambioMagazzino): number {
  const v = r.prezzoFornitoreOriginale * r.scorta;
  return Math.round(v * 100) / 100;
}
