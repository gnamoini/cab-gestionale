import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  metaFieldsToRicambioUi,
  parseMagazzinoRicambioMeta,
  ricambioUiToMagazzinoMeta,
} from "@/lib/magazzino/magazzino-meta";
import type { MagazzinoInsert, MagazzinoUpdate } from "@/src/services/magazzino.service";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Riga Supabase → modello UI magazzino. */
export function magazzinoRowToRicambioUI(row: MagazzinoRicambioRow, autore = "Sistema"): RicambioMagazzino {
  const listino = num(row.costo, 0);
  const vendita = num(row.prezzo_vendita, listino);
  const markup =
    listino > 0 ? Math.round(((vendita - listino) / listino) * 1000) / 10 : 0;
  const meta = parseMagazzinoRicambioMeta(row.meta ?? {});
  const fromMeta = metaFieldsToRicambioUi(meta);

  return {
    id: row.id,
    marca: row.marca?.trim() || "—",
    codiceFornitoreOriginale: row.codice,
    descrizione: row.nome,
    note: fromMeta.note,
    categoria: fromMeta.categoria,
    compatibilitaMezzi: fromMeta.compatibilitaMezzi,
    scorta: Math.max(0, Math.round(num(row.quantita, 0))),
    scortaMinima: fromMeta.scortaMinima,
    dataUltimaModifica: row.updated_at ?? row.created_at,
    autoreUltimaModifica: autore,
    prezzoFornitoreOriginale: listino,
    scontoFornitoreOriginale: fromMeta.scontoFornitoreOriginale,
    markupPercentuale: markup,
    prezzoVendita: vendita,
    fornitoreNonOriginale: fromMeta.fornitoreNonOriginale,
    codiceFornitoreNonOriginale: fromMeta.codiceFornitoreNonOriginale,
    prezzoFornitoreNonOriginale: fromMeta.prezzoFornitoreNonOriginale,
    scontoFornitoreNonOriginale: fromMeta.scontoFornitoreNonOriginale,
  };
}

/** Modello UI → insert Supabase. */
export function ricambioUiToMagazzinoInsert(r: RicambioMagazzino): MagazzinoInsert {
  return {
    codice: r.codiceFornitoreOriginale.trim(),
    nome: r.descrizione.trim(),
    marca: r.marca.trim() || null,
    quantita: Math.max(0, Math.round(r.scorta)),
    costo: r.prezzoFornitoreOriginale > 0 ? r.prezzoFornitoreOriginale : null,
    prezzo_vendita: r.prezzoVendita > 0 ? r.prezzoVendita : null,
    consumo_medio_mensile: null,
    meta: ricambioUiToMagazzinoMeta(r) as Record<string, unknown>,
  };
}

export function ricambioUiToMagazzinoUpdate(r: RicambioMagazzino): MagazzinoUpdate {
  return ricambioUiToMagazzinoInsert(r);
}
