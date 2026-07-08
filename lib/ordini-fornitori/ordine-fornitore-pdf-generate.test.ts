import assert from "node:assert/strict";
import {
  buildOrdineFornitoreDatiOrdinePdfFields,
  buildOrdineFornitorePartyBlocks,
} from "@/lib/ordini-fornitori/ordine-fornitore-pdf-generate";
import { buildEmptyOrdineFornitore } from "@/lib/ordini-fornitori/build-empty-ordine-fornitore";

const empty = buildEmptyOrdineFornitore();
assert.deepEqual(buildOrdineFornitoreDatiOrdinePdfFields(empty), []);

const withOggetto = { ...empty, oggettoOrdine: "Ricambi freni" };
assert.deepEqual(buildOrdineFornitoreDatiOrdinePdfFields(withOggetto), [
  { label: "Oggetto ordine", value: "Ricambi freni" },
]);

const parties = buildOrdineFornitorePartyBlocks({
  ...empty,
  fornitoreLabel: "Exelentia Srl",
  fornitoreSnapshot: { ragioneSociale: "Exelentia Srl", indirizzo: "Roma", partitaIva: "IT123" },
});
assert.match(parties.fornitore, /Exelentia/);

console.log("ordine-fornitore-pdf-generate.test.ts ok");
