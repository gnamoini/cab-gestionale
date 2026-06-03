import assert from "node:assert/strict";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { normalizedSearchIndex } from "@/lib/magazzino/compat/compat-search-index";
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

const base: RicambioMagazzino = {
  id: "r1",
  marca: "BOSCH",
  codiceFornitoreOriginale: "ABC123",
  codiceFornitoreOriginaleSecondario: "SEC999",
  descrizione: "Filtro olio",
  note: "",
  categoria: "Generale",
  compatibilitaMezzi: [compatLabelMarcaModello("FIAT", "500")],
  compatibilitaRefs: [{ tree: "attrezzature", marcaId: "m-fiat", modelloId: "mod-500" }],
  scorta: 1,
  scortaMinima: 0,
  dataUltimaModifica: "",
  autoreUltimaModifica: "",
  prezzoFornitoreOriginale: 10,
  scontoFornitoreOriginale: 0,
  markupPercentuale: 0,
  prezzoVendita: 10,
  fornitoreNonOriginale: "",
  codiceFornitoreNonOriginale: "",
  prezzoFornitoreNonOriginale: 0,
  scontoFornitoreNonOriginale: 0,
};

const hay = normalizedSearchIndex(base, mezziListe);
assert.ok(hay.includes("sec999"));
assert.ok(hay.includes("fiat"));
assert.ok(hay.includes("500"));

console.log("compat-search-index.test.ts OK");
