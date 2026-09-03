import { prezzoNetto, prezzoNettoFornitoreOriginale } from "@/lib/magazzino/calculations";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { PreventivoRigaRicambio } from "@/lib/preventivi/types";

/** Costo acquisto unitario — primo alternativo, poi listino OE netto. */
export function costoUnitarioAcquistoRicambio(r: RicambioMagazzino): number {
  const alt = r.fornitoriAlternativi?.[0];
  if (alt && Number(alt.prezzo) > 0) {
    return prezzoNetto(alt.prezzo, alt.sconto ?? 0);
  }
  if (r.prezzoFornitoreNonOriginale > 0) {
    return prezzoNetto(r.prezzoFornitoreNonOriginale, r.scontoFornitoreNonOriginale);
  }
  return prezzoNettoFornitoreOriginale(r);
}

/** Costo unitario riga preventivo — snapshot riga, poi magazzino live, poi 0. */
export function resolvePreventivoRigaRicambioCostoUnitario(
  r: PreventivoRigaRicambio,
  magazzino?: RicambioMagazzino | null,
): number {
  const stored = Number(r.costoUnitario);
  if (Number.isFinite(stored) && stored > 0) return Math.round(stored * 100) / 100;
  if (magazzino) return costoUnitarioAcquistoRicambio(magazzino);
  return 0;
}
