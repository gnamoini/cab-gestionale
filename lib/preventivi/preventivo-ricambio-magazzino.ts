import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import { formatRicambioDescrizioneForUi } from "@/lib/magazzino/ricambio-descrizione-display";
import { parseRicambioUnitaMisura } from "@/lib/magazzino/ricambio-unita-misura";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { PreventivoRigaRicambio } from "@/lib/preventivi/types";

export function suggestionsForPreventivoRigaRicambio(
  r: Pick<PreventivoRigaRicambio, "descrizione" | "codiceOE">,
  prodotti: readonly RicambioMagazzino[],
) {
  const q = `${r.descrizione} ${r.codiceOE}`.trim().toLowerCase();
  if (q.length < 1) return [];
  return prodotti
    .filter((p) => {
      const d = (p.descrizione ?? "").toLowerCase();
      const c = [ricambioCodiceForUi(p.codiceFornitoreOriginale), p.codiceFornitoreOriginaleSecondario]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const m = (p.marca ?? "").toLowerCase();
      return (
        d.includes(q) ||
        c.includes(q) ||
        m.includes(q) ||
        q.split(/\s+/).every((w) => w && (d.includes(w) || c.includes(w) || m.includes(w)))
      );
    })
    .slice(0, 12);
}

export function applyMagazzinoToPreventivoRigaRicambio(
  row: PreventivoRigaRicambio,
  item: RicambioMagazzino,
  scontoPercent?: number,
): PreventivoRigaRicambio {
  const codiceOE = ricambioCodiceForUi(item.codiceFornitoreOriginale) || row.codiceOE;
  const descrizione = formatRicambioDescrizioneForUi(item.descrizione ?? "") || row.descrizione;
  const prezzoUnitario = Math.round((item.prezzoVendita ?? 0) * 100) / 100;
  const unitaMisura = parseRicambioUnitaMisura(item.unitaMisura ?? row.unitaMisura);
  return {
    ...row,
    ricambioId: item.id,
    codiceOE,
    descrizione,
    prezzoUnitario,
    unitaMisura,
    ...(scontoPercent !== undefined ? { scontoPercent } : {}),
  };
}
