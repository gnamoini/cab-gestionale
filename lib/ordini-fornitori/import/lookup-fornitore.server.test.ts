import assert from "node:assert/strict";
import { lookupFornitoreByPivaCfName } from "@/lib/ordini-fornitori/import/lookup-fornitore.server";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";

const mag: MagazzinoMasterPrefs = {
  marche: [],
  categorie: [],
  mezziCompatibili: [],
  fornitori: ["ACME Ricambi", "Bosch Parts"],
  produttori: [],
  fornitoreAnagraficaByFornitore: {
    "acme ricambi": {
      ragioneSociale: "ACME Ricambi SRL",
      partitaIva: "12345678901",
      codiceFiscale: "12345678901",
      indirizzo: "",
      telefono: "",
    },
    "bosch parts": {
      ragioneSociale: "Bosch Parts Italia",
      partitaIva: "",
      codiceFiscale: "",
      indirizzo: "",
      telefono: "",
    },
  },
};

const byPiva = lookupFornitoreByPivaCfName({ partitaIva: "IT12345678901" }, mag);
assert.equal(byPiva.matched, true);
assert.equal(byPiva.label, "ACME Ricambi");
assert.equal(byPiva.matchMethod, "piva");

const byExact = lookupFornitoreByPivaCfName({ ragioneSociale: "Bosch Parts" }, mag);
assert.equal(byExact.matched, true);
assert.equal(byExact.matchMethod, "exact");

const unknown = lookupFornitoreByPivaCfName({ ragioneSociale: "Nuovo Fornitore SPA" }, mag);
assert.equal(unknown.matched, false);
assert.equal(unknown.matchMethod, "none");
assert.equal(unknown.label, "Nuovo Fornitore SPA");

console.log("lookup-fornitore.server.test.ts OK");
