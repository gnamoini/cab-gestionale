import { prezzoNetto } from "@/lib/magazzino/calculations";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

/** Default prezzo acquisto da magazzino per fornitore scelto. */
export function defaultPrezzoUnitarioOrdineFromRicambio(
  ricambio: RicambioMagazzino,
  fornitoreLabel?: string,
): { prezzo: number; scontoPercent: number } {
  const label = fornitoreLabel?.trim().toLowerCase();
  const alt = ricambio.fornitoriAlternativi?.find(
    (f) => f.fornitore.trim().toLowerCase() === label,
  );
  if (alt) {
    return {
      prezzo: alt.prezzo,
      scontoPercent: alt.sconto ?? 0,
    };
  }
  return {
    prezzo: ricambio.prezzoFornitoreOriginale ?? 0,
    scontoPercent: ricambio.scontoFornitoreOriginale ?? 0,
  };
}

export function defaultPrezzoNettoOrdineFromRicambio(
  ricambio: RicambioMagazzino,
  fornitoreLabel?: string,
): number {
  const { prezzo, scontoPercent } = defaultPrezzoUnitarioOrdineFromRicambio(ricambio, fornitoreLabel);
  return prezzoNetto(prezzo, scontoPercent);
}
