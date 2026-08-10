import assert from "node:assert/strict";
import {
  buildMagazzinoSearchSuggestions,
  magazzinoSearchQueryFromSuggestion,
} from "@/lib/magazzino/magazzino-list-ui-filters";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

const row = {
  id: "r1",
  marca: "BTE",
  descrizione: "FILTRO OLIO",
  codiceFornitoreOriginale: "bu500",
  codiceFornitoreOriginaleSecondario: "",
  categoria: "",
  scorta: 1,
  scortaMinima: 0,
  unitaMisura: "pz",
  compatibilitaMezzi: [],
  fornitoriAlternativi: [],
} as unknown as RicambioMagazzino;

const suggestions = buildMagazzinoSearchSuggestions([row], "bu500", 8);
assert.ok(suggestions.some((s) => s.includes("BU500") && s.includes("FILTRO")), "combined codice+descrizione");
assert.ok(!suggestions.includes("BU500"), "no bare codice when linked to ricambio");

assert.equal(magazzinoSearchQueryFromSuggestion("BU500 · FILTRO OLIO"), "BU500");
assert.equal(magazzinoSearchQueryFromSuggestion("solo-marca"), "solo-marca");

console.log("magazzino-list-ui-filters.test.ts OK");
