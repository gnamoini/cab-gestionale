import assert from "node:assert/strict";
import { toMagazzinoSottoScortaLogViewModel } from "@/lib/magazzino/magazzino-sotto-scorta-notification-message";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

const base: RicambioMagazzino = {
  id: "ric-1",
  marca: "Bosch",
  codiceFornitoreOriginale: "ABC123",
  codiceFornitoreOriginaleSecondario: "",
  marcaOriginaleSecondaria: "",
  usatoInTagliandi: false,
  unitaMisura: "pz",
  descrizione: "Filtro olio",
  note: "",
  categoria: "Filtri",
  compatibilitaMezzi: [],
  scorta: 1,
  scortaMinima: 5,
  dataUltimaModifica: "2026-06-01T10:00:00.000Z",
  autoreUltimaModifica: "Mario Rossi",
  prezzoFornitoreOriginale: 10,
  scontoFornitoreOriginale: 0,
  markupPercentuale: 0,
  prezzoVendita: 10,
  fornitoriAlternativi: [],
  fornitoreNonOriginale: "",
  codiceFornitoreNonOriginale: "",
  prezzoFornitoreNonOriginale: 0,
  scontoFornitoreNonOriginale: 0,
};

const vm = toMagazzinoSottoScortaLogViewModel(base);
assert.equal(vm.tipoRiga, "SOTTO SCORTA");
assert.equal(vm.oggettoRiga, "Bosch Filtro olio");
assert.doesNotMatch(vm.modificaRiga, /Marca:/);
assert.match(vm.modificaRiga, /Codice: ABC123/);
assert.match(vm.modificaRiga, /Scorta: 1 \(min\. 5\)/);
assert.equal(vm.autore, "Mario Rossi");

console.log("magazzino-sotto-scorta-notification-message.test.ts: OK");
