import { resolveListinoMarkupBase } from "@/lib/magazzino/calculations";
import {
  resolveRicambioCodiceForPersist,
  ricambioCodiceForUi,
} from "@/lib/magazzino/ricambio-codice";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  metaFieldsToRicambioUi,
  parseMagazzinoRicambioMeta,
  ricambioUiToMagazzinoMeta,
} from "@/lib/magazzino/magazzino-meta";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { MagazzinoInsert, MagazzinoUpdate } from "@/src/services/magazzino.service";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isMagazzinoUuid(id: string): boolean {
  return UUID_RE.test(id.trim());
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Riga Supabase → modello UI magazzino. */
export function magazzinoRowToRicambioUI(
  row: MagazzinoRicambioRow,
  autore = "Sistema",
  _mezziListe?: MezziListePrefs,
): RicambioMagazzino {
  void _mezziListe;
  const meta = parseMagazzinoRicambioMeta(row.meta ?? {});
  const fromMeta = metaFieldsToRicambioUi(meta);
  const listino = num(row.costo, 0);
  const vendita = num(row.prezzo_vendita, listino);
  const markupBase = resolveListinoMarkupBase(listino, fromMeta.fornitoriAlternativi ?? []);
  const markup =
    markupBase > 0 ? Math.round(((vendita - markupBase) / markupBase) * 1000) / 10 : 0;
  const autoreSalvato = meta.autoreUltimaModifica?.trim();

  return {
    id: row.id,
    marca: row.marca?.trim() || "—",
    codiceFornitoreOriginale: ricambioCodiceForUi(row.codice),
    codiceFornitoreOriginaleSecondario: fromMeta.codiceFornitoreOriginaleSecondario,
    marcaOriginaleSecondaria: fromMeta.marcaOriginaleSecondaria,
    usatoInTagliandi: fromMeta.usatoInTagliandi,
    unitaMisura: fromMeta.unitaMisura,
    descrizione: row.nome,
    note: fromMeta.note,
    categoria: fromMeta.categoria,
    compatibilitaMezzi: fromMeta.compatibilitaMezzi,
    compatibilitaRefs: fromMeta.compatibilitaRefs,
    scorta: Math.max(0, Math.round(num(row.quantita, 0))),
    scortaMinima: fromMeta.scortaMinima,
    dataUltimaModifica: row.updated_at ?? row.created_at,
    autoreUltimaModifica: autoreSalvato || autore,
    prezzoFornitoreOriginale: listino,
    scontoFornitoreOriginale: fromMeta.scontoFornitoreOriginale,
    markupPercentuale: markup,
    prezzoVendita: vendita,
    fornitoriAlternativi: fromMeta.fornitoriAlternativi,
    fornitoreNonOriginale: fromMeta.fornitoreNonOriginale,
    codiceFornitoreNonOriginale: fromMeta.codiceFornitoreNonOriginale,
    prezzoFornitoreNonOriginale: fromMeta.prezzoFornitoreNonOriginale,
    scontoFornitoreNonOriginale: fromMeta.scontoFornitoreNonOriginale,
    listinoImport: meta.listinoImport,
  };
}

/** Modello UI → insert Supabase. */
export function ricambioUiToMagazzinoInsert(
  r: RicambioMagazzino,
  mezziListe?: MezziListePrefs,
  metaPatch?: Record<string, unknown>,
): MagazzinoInsert {
  const row: MagazzinoInsert = {
    codice: resolveRicambioCodiceForPersist(r.codiceFornitoreOriginale),
    nome: r.descrizione.trim(),
    marca: r.marca.trim() || null,
    quantita: Math.max(0, Math.round(r.scorta)),
    costo: r.prezzoFornitoreOriginale > 0 ? r.prezzoFornitoreOriginale : null,
    prezzo_vendita: r.prezzoVendita > 0 ? r.prezzoVendita : null,
    consumo_medio_mensile: null,
    meta: { ...(ricambioUiToMagazzinoMeta(r, mezziListe) as Record<string, unknown>), ...(metaPatch ?? {}) },
  };
  if (isMagazzinoUuid(r.id)) {
    return { ...row, id: r.id } as MagazzinoInsert & { id: string };
  }
  return row;
}

export function ricambioUiToMagazzinoUpdate(r: RicambioMagazzino, mezziListe?: MezziListePrefs): MagazzinoUpdate {
  const insert = ricambioUiToMagazzinoInsert(r, mezziListe) as MagazzinoInsert & { id?: string };
  const { quantita: _quantita, id: _id, ...patch } = insert;
  void _quantita;
  void _id;
  return patch;
}
