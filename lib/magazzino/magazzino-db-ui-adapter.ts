import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MagazzinoInsert, MagazzinoUpdate } from "@/src/services/magazzino.service";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Riga Supabase → modello UI magazzino (campi non persistiti su DB usano default sicuri). */
export function magazzinoRowToRicambioUI(row: MagazzinoRicambioRow, autore = "Sistema"): RicambioMagazzino {
  const listino = num(row.costo, 0);
  const vendita = num(row.prezzo_vendita, listino);
  const markup =
    listino > 0 ? Math.round(((vendita - listino) / listino) * 1000) / 10 : 0;
  return {
    id: row.id,
    marca: row.marca?.trim() || "—",
    codiceFornitoreOriginale: row.codice,
    descrizione: row.nome,
    note: "",
    categoria: "Generale",
    compatibilitaMezzi: [],
    scorta: Math.max(0, Math.round(num(row.quantita, 0))),
    scortaMinima: 0,
    dataUltimaModifica: row.updated_at ?? row.created_at,
    autoreUltimaModifica: autore,
    prezzoFornitoreOriginale: listino,
    scontoFornitoreOriginale: 0,
    markupPercentuale: markup,
    prezzoVendita: vendita,
    fornitoreNonOriginale: "",
    codiceFornitoreNonOriginale: "",
    prezzoFornitoreNonOriginale: 0,
    scontoFornitoreNonOriginale: 0,
  };
}

/** Modello UI → insert Supabase (subset campi supportati dal DB). */
export function ricambioUiToMagazzinoInsert(r: RicambioMagazzino): MagazzinoInsert {
  return {
    codice: r.codiceFornitoreOriginale.trim(),
    nome: r.descrizione.trim(),
    marca: r.marca.trim() || null,
    quantita: Math.max(0, Math.round(r.scorta)),
    costo: r.prezzoFornitoreOriginale > 0 ? r.prezzoFornitoreOriginale : null,
    prezzo_vendita: r.prezzoVendita > 0 ? r.prezzoVendita : null,
    consumo_medio_mensile: null,
  };
}

export function ricambioUiToMagazzinoUpdate(r: RicambioMagazzino): MagazzinoUpdate {
  return ricambioUiToMagazzinoInsert(r);
}
