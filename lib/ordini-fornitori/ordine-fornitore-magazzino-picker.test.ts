import assert from "node:assert/strict";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  codiceRicambioPerFornitoreOrdine,
  ricambioBelongsToFornitoreOrdine,
  searchMagazzinoForOrdineFornitore,
} from "@/lib/ordini-fornitori/ordine-fornitore-magazzino-picker";

const base = (patch: Partial<RicambioMagazzino>): RicambioMagazzino =>
  ({
    id: "1",
    marca: "Bosch",
    codiceFornitoreOriginale: "OE-1",
    codiceFornitoreOriginaleSecondario: "",
    marcaOriginaleSecondaria: "",
    usatoInTagliandi: false,
    unitaMisura: "pz",
    descrizione: "Filtro olio",
    note: "",
    categoria: "",
    compatibilitaMezzi: [],
    scorta: 0,
    scortaMinima: 0,
    dataUltimaModifica: "",
    autoreUltimaModifica: "",
    prezzoFornitoreOriginale: 10,
    scontoFornitoreOriginale: 0,
    markupPercentuale: 0,
    prezzoVendita: 0,
    fornitoriAlternativi: [],
    fornitoreNonOriginale: "",
    codiceFornitoreNonOriginale: "",
    prezzoFornitoreNonOriginale: 0,
    scontoFornitoreNonOriginale: 0,
    ...patch,
  }) as RicambioMagazzino;

const acme = base({
  id: "a",
  descrizione: "Filtro ACME",
  fornitoriAlternativi: [{ id: "fa", fornitore: "ACME Ricambi", produttore: "", codice: "AC-99", prezzo: 8, sconto: 5 }],
});
const other = base({ id: "b", descrizione: "Candela generica", codiceFornitoreOriginale: "GEN-1" });

assert.equal(ricambioBelongsToFornitoreOrdine(acme, "ACME Ricambi"), true);
assert.equal(ricambioBelongsToFornitoreOrdine(other, "ACME Ricambi"), false);
assert.equal(codiceRicambioPerFornitoreOrdine(acme, "ACME Ricambi"), "AC-99");

const hits = searchMagazzinoForOrdineFornitore([other, acme], "filtro", "ACME Ricambi");
assert.equal(hits[0]?.id, "a");

console.log("ordine-fornitore-magazzino-picker.test.ts OK");
