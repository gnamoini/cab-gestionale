import { normFornitoreAlternativoKey } from "@/lib/magazzino/fornitore-alternativo-sconto";
import { parseRicambioUnitaMisura } from "@/lib/magazzino/ricambio-unita-misura";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { defaultPrezzoUnitarioOrdineFromRicambio } from "@/lib/ordini-fornitori/ordine-fornitore-ricambio-price";
import type { OrdineFornitoreRiga } from "@/lib/ordini-fornitori/types";

export function ricambioBelongsToFornitoreOrdine(
  ricambio: RicambioMagazzino,
  fornitoreLabel: string,
): boolean {
  const key = normFornitoreAlternativoKey(fornitoreLabel);
  if (!key) return false;
  if (normFornitoreAlternativoKey(ricambio.fornitoreNonOriginale) === key) return true;
  return (ricambio.fornitoriAlternativi ?? []).some(
    (f) => normFornitoreAlternativoKey(f.fornitore) === key,
  );
}

/** Codice listino da usare in ordine per il fornitore selezionato. */
export function codiceRicambioPerFornitoreOrdine(
  ricambio: RicambioMagazzino,
  fornitoreLabel: string,
): string {
  const key = normFornitoreAlternativoKey(fornitoreLabel);
  const alt = (ricambio.fornitoriAlternativi ?? []).find(
    (f) => normFornitoreAlternativoKey(f.fornitore) === key,
  );
  if (alt?.codice?.trim()) return alt.codice.trim();
  if (ricambioBelongsToFornitoreOrdine(ricambio, fornitoreLabel)) {
    const legacy = ricambio.codiceFornitoreNonOriginale?.trim();
    if (legacy) return legacy;
  }
  return (
    ricambio.codiceFornitoreOriginale?.trim() ||
    ricambio.codiceFornitoreOriginaleSecondario?.trim() ||
    ""
  );
}

function ricambioSearchHaystack(ricambio: RicambioMagazzino, fornitoreLabel: string): string {
  const codes = new Set<string>();
  const push = (v: string | undefined) => {
    const t = v?.trim();
    if (t) codes.add(t.toLowerCase());
  };
  push(codiceRicambioPerFornitoreOrdine(ricambio, fornitoreLabel));
  push(ricambio.codiceFornitoreOriginale);
  push(ricambio.codiceFornitoreOriginaleSecondario);
  for (const f of ricambio.fornitoriAlternativi ?? []) push(f.codice);
  return [
    ricambio.descrizione ?? "",
    ricambio.marca ?? "",
    ricambio.note ?? "",
    ...codes,
  ]
    .join(" ")
    .toLowerCase();
}

export function ricambioMatchesMagazzinoQuery(
  ricambio: RicambioMagazzino,
  query: string,
  fornitoreLabel = "",
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const hay = ricambioSearchHaystack(ricambio, fornitoreLabel);
  if (hay.includes(q)) return true;
  return q.split(/\s+/).every((w) => w && hay.includes(w));
}

export function searchMagazzinoForOrdineFornitore(
  items: readonly RicambioMagazzino[],
  query: string,
  fornitoreLabel: string,
  limit = 16,
): RicambioMagazzino[] {
  const q = query.trim();
  if (q.length < 1) return [];
  const hits = items.filter((p) => ricambioMatchesMagazzinoQuery(p, q, fornitoreLabel));
  hits.sort((a, b) => {
    const aForn = ricambioBelongsToFornitoreOrdine(a, fornitoreLabel) ? 0 : 1;
    const bForn = ricambioBelongsToFornitoreOrdine(b, fornitoreLabel) ? 0 : 1;
    if (aForn !== bForn) return aForn - bForn;
    return (a.descrizione ?? "").localeCompare(b.descrizione ?? "", "it");
  });
  return hits.slice(0, limit);
}

export function ordineRigaPatchFromRicambio(
  ricambio: RicambioMagazzino,
  fornitoreLabel: string,
  ivaDefault: number,
): Pick<
  OrdineFornitoreRiga,
  "ricambioId" | "codice" | "descrizione" | "prezzoUnitario" | "scontoPercent" | "unitaMisura" | "ivaPercent"
> {
  const { prezzo, scontoPercent } = defaultPrezzoUnitarioOrdineFromRicambio(ricambio, fornitoreLabel);
  return {
    ricambioId: ricambio.id,
    codice: codiceRicambioPerFornitoreOrdine(ricambio, fornitoreLabel),
    descrizione: ricambio.descrizione ?? "",
    prezzoUnitario: prezzo,
    scontoPercent,
    unitaMisura: parseRicambioUnitaMisura(ricambio.unitaMisura),
    ivaPercent: ivaDefault,
  };
}
