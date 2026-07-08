import assert from "node:assert/strict";
import { renameFornitoreInMagazzinoMaster } from "@/lib/magazzino/fornitore-alternativo-sconto";
import {
  fornitoreAnagraficaToOrdineSnapshot,
  getFornitoreAnagraficaSettings,
  setFornitoreAnagraficaSettings,
} from "@/lib/magazzino/fornitore-anagrafica";
import { applyFornitoreLabelToRecord } from "@/lib/ordini-fornitori/build-empty-ordine-fornitore";
import { buildEmptyOrdineFornitore } from "@/lib/ordini-fornitori/build-empty-ordine-fornitore";
import { parseOrdineFornitoreFornitoreSnapshot } from "@/lib/ordini-fornitori/fornitore-snapshot";

const emptyMag = { marche: [], categorie: [], mezziCompatibili: [], fornitori: ["ACME"], produttori: [] };

let mag = setFornitoreAnagraficaSettings(emptyMag, "ACME", {
  indirizzo: "Via Roma 1",
  partitaIva: "IT111",
  codiceFiscale: "CF111",
  telefono: "080111",
});

assert.equal(getFornitoreAnagraficaSettings(mag, "ACME").partitaIva, "IT111");

mag = renameFornitoreInMagazzinoMaster(mag, "ACME", "ACME Sud");
assert.equal(getFornitoreAnagraficaSettings(mag, "ACME Sud").telefono, "080111");

const snap = fornitoreAnagraficaToOrdineSnapshot("ACME Sud", getFornitoreAnagraficaSettings(mag, "ACME Sud"));
const order = applyFornitoreLabelToRecord(buildEmptyOrdineFornitore(), "ACME Sud", getFornitoreAnagraficaSettings(mag, "ACME Sud"));
const parsed = parseOrdineFornitoreFornitoreSnapshot(order.fornitoreSnapshot, order.fornitoreLabel);
assert.equal(parsed.indirizzo, snap.indirizzo);
assert.equal(parsed.partitaIva, "IT111");

console.log("fornitore-anagrafica.test.ts OK");
