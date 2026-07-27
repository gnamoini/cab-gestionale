import assert from "node:assert/strict";
import { buildSearchDocumentLavorazione } from "@/lib/search/builders/build-search-document-lavorazione";
import { matchSearchQuery, matchSearchString } from "@/lib/search/match";
import { normalizeSearchText } from "@/lib/search/normalize";
import { parseSearchQuery } from "@/lib/search/parse-query";
import { scoreTokenAgainstHaystack } from "@/lib/search/rank";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

// normalize
assert.equal(normalizeSearchText("HB440PC"), normalizeSearchText("hb440pc"));
assert.equal(normalizeSearchText("Mottolà"), "mottola");
assert.equal(normalizeSearchText("  foo-bar  "), "foo-bar");
assert.equal(normalizeSearchText("foo.bar"), "foo bar");

// token vs phrase
const tokens = parseSearchQuery("Iveco HB440PC");
assert.equal(tokens.mode, "tokens");
assert.deepEqual(tokens.tokens, ["iveko", "hb440pk"]);

const phrase = parseSearchQuery('"pompa idraulica"');
assert.equal(phrase.mode, "phrase");
assert.equal(phrase.phrase, "pompa idraulika");

// field filter stub
const withField = parseSearchQuery("cliente:mottola compatt");
assert.equal(withField.fieldFilters.length, 1);
assert.equal(withField.fieldFilters[0]?.field, "cliente");

// multi-token AND
const doc = "iveko compattatore targa hb440pk mottola";
assert.equal(matchSearchString("iveko compatt", doc).matches, true);
assert.equal(matchSearchString("iveko qqqqqq", doc).matches, false);

// phrase
assert.equal(matchSearchString('"pompa idraulika"', "nota pompa idraulika ok").matches, true);

// ranking: exact plate beats contains in note
const plateScore = scoreTokenAgainstHaystack("hb440pk", "hb440pk cliente note hb440pk lunga", "plate");
const noteContains = scoreTokenAgainstHaystack("hb440pk", "nota lunga con hb440pk nel testo", "note");
assert.ok(plateScore.score > noteContains.score);

// lavorazioni builder smoke
const lavRow = {
  id: "id-1",
  codice: "LAV-001",
  note: "sostituzione pompa",
  stato: "in_lavorazione",
  mezzo: { targa: "HB440PC", marca_telaio: "IVECO", modello_telaio: "Eurocargo", cliente: "Mottola - TA" },
} as unknown as LavorazioneListRow;
const lavDoc = buildSearchDocumentLavorazione(lavRow);
assert.ok(matchSearchString("HB440PC", lavDoc).matches);
assert.ok(matchSearchString("iveko", lavDoc).matches);
assert.ok(matchSearchString("mottola", lavDoc).matches);
assert.ok(matchSearchString("pompa", lavDoc).matches);

const lavBadgeRow = {
  ...lavRow,
  is_tagliando: true,
  is_garanzia: true,
} as unknown as LavorazioneListRow;
const lavBadgeDoc = buildSearchDocumentLavorazione(lavBadgeRow);
assert.ok(matchSearchString("tagliando", lavBadgeDoc).matches);
assert.ok(matchSearchString("garanzia", lavBadgeDoc).matches);

console.log("search-engine.test.ts OK");
