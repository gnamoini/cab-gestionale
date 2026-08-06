import assert from "node:assert/strict";
import { buildSearchDocumentFromFields } from "@/lib/search/build-document";
import { buildSearchDocumentLavorazione } from "@/lib/search/builders/build-search-document-lavorazione";
import { collapseSearchKey, formatFieldSearchToken } from "@/lib/search/field-token";
import { matchSearchString, scoreSearchDocument } from "@/lib/search/match";
import { SEARCH_FIELD_MARKER_WEIGHT } from "@/lib/search/rank";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

// collapse separatori misti
assert.equal(collapseSearchKey("CE.R.E.B.A"), "cereba");
assert.equal(collapseSearchKey("DU3/RCPP"), "du3rcpp");
assert.equal(collapseSearchKey("DU3 RCPP"), "du3rcpp");
assert.equal(collapseSearchKey("HB-440-PC"), "hb440pc");
assert.equal(collapseSearchKey("CE.RE.BA"), collapseSearchKey("cereba"));
assert.equal(collapseSearchKey("DU3-RCPP"), collapseSearchKey("DU3RCPP"));

// anti-collisione marker
assert.equal(formatFieldSearchToken("marca", "ABC"), "marca:abc");
assert.equal(formatFieldSearchToken("codice", "123"), "codice:123");
const hayCollision = buildSearchDocumentFromFields(
  [
    { kind: "brand", value: "ABC" },
    { kind: "code", value: "123" },
  ],
  [],
);
assert.ok(!hayCollision.includes("abc123"));
assert.ok(!hayCollision.includes("marca:abc123"));
assert.ok(!hayCollision.includes("codice:abc123"));

// lavorazioni cereba
const lavRow = {
  id: "id-1",
  codice: "LAV-001",
  note: "intervento",
  stato: "in_lavorazione",
  mezzo: { targa: "HB440PC", cliente: "ce.re.ba", marca_telaio: "IVECO" },
} as unknown as LavorazioneListRow;
const lavDoc = buildSearchDocumentLavorazione(lavRow);
for (const q of ["cereba", "CE.RE.BA", "ce re ba"]) {
  assert.ok(matchSearchString(q, lavDoc).matches, `lavorazione should match ${q}`);
}

// magazzino DU3RCPP
const magDoc = buildSearchDocumentFromFields(
  [{ kind: "code", value: "DU3-RCPP" }, { kind: "description", value: "filtro olio DU3 serie" }],
  [],
);
for (const q of ["DU3RCPP", "du3rcpp", "DU3"]) {
  assert.ok(matchSearchString(q, magDoc).matches, `magazzino should match ${q}`);
}

const exactCodeScore = scoreSearchDocument("DU3RCPP", magDoc).score;
const descOnlyDoc = buildSearchDocumentFromFields(
  [{ kind: "description", value: "ricambio con DU3RCPP nel testo lungo" }],
  [],
);
const descScore = scoreSearchDocument("DU3RCPP", descOnlyDoc).score;
assert.ok(exactCodeScore > descScore);
assert.ok(exactCodeScore >= SEARCH_FIELD_MARKER_WEIGHT.codice - 50);

console.log("search-collapse-regression.test.ts OK");
