import assert from "node:assert/strict";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { normalizedSearchIndex } from "@/lib/magazzino/compat/compat-search-index";
import { defaultRicambioMagazzinoFields } from "@/lib/magazzino/ricambio-magazzino-defaults";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";

const mezziListe: MezziListePrefs = {
  clienti: [],
  utilizzatori: [],
  cantieri: [],
  marche: [],
  modelli: [],
  tipiAttrezzatura: [],
  stati: [],
  attrezzature: [
    {
      id: "m-fiat",
      nome: "FIAT",
      modelli: [{ id: "mod-500", nome: "500" }],
    },
  ],
  telai: [],
};

const base: RicambioMagazzino = defaultRicambioMagazzinoFields({
  id: "r1",
  marca: "BOSCH",
  codiceFornitoreOriginale: "ABC123",
  codiceFornitoreOriginaleSecondario: "SEC999",
  descrizione: "Filtro olio",
  compatibilitaMezzi: [compatLabelMarcaModello("FIAT", "500")],
  compatibilitaRefs: [{ tree: "attrezzature", marcaId: "m-fiat", modelloId: "mod-500" }],
  scorta: 1,
  prezzoFornitoreOriginale: 10,
  prezzoVendita: 10,
});

const hay = normalizedSearchIndex(base, mezziListe);
assert.ok(hay.includes("sec999"));
assert.ok(hay.includes("fiat"));
assert.ok(hay.includes("500"));

console.log("compat-search-index.test.ts OK");
