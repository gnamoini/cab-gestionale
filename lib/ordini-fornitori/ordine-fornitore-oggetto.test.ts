import assert from "node:assert/strict";
import {
  ordineMetaWithOggetto,
  ordineRecordWithOggetto,
  readOrdineOggetto,
} from "@/lib/ordini-fornitori/ordine-fornitore-oggetto";
import { buildEmptyOrdineFornitore } from "@/lib/ordini-fornitori/build-empty-ordine-fornitore";

assert.equal(readOrdineOggetto({ oggettoOrdine: "Ricambi freni" }), "Ricambi freni");
assert.equal(readOrdineOggetto({}), "");

const withOggetto = ordineMetaWithOggetto({ import: { v: 1 } }, "  Filtri olio  ");
assert.equal(withOggetto.oggettoOrdine, "Filtri olio");
assert.deepEqual(withOggetto.import, { v: 1 });

const cleared = ordineMetaWithOggetto(withOggetto, "   ");
assert.equal(cleared.oggettoOrdine, undefined);
assert.deepEqual(cleared.import, { v: 1 });

const record = ordineRecordWithOggetto(buildEmptyOrdineFornitore(), "Pastiglie");
assert.equal(record.oggettoOrdine, "Pastiglie");
assert.equal(record.meta.oggettoOrdine, "Pastiglie");

console.log("ordine-fornitore-oggetto.test.ts ok");
