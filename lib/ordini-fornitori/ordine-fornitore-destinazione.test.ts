import assert from "node:assert/strict";
import {
  applyDestinazioneAltro,
  applyDestinazioneMagazzino,
  defaultNewOrdineDestinazione,
  readDestinazioneTipo,
} from "@/lib/ordini-fornitori/ordine-fornitore-destinazione";
import { parseOrdineFornitoreDestinatarioSnapshot } from "@/lib/ordini-fornitori/destinatario-snapshot";
import { buildEmptyOrdineFornitore } from "@/lib/ordini-fornitori/build-empty-ordine-fornitore";

const MAG = "Via Roma 1, 70100 Bari, BA";

assert.equal(readDestinazioneTipo({ tipo: "altro" }, MAG, MAG), "altro");
assert.equal(readDestinazioneTipo({}, MAG, MAG), "magazzino");
assert.equal(readDestinazioneTipo({}, "Altro indirizzo", MAG), "altro");
assert.equal(readDestinazioneTipo({}, "", MAG), "magazzino");

const empty = buildEmptyOrdineFornitore();
const withMag = applyDestinazioneMagazzino(empty, MAG);
assert.equal(withMag.destinazione, MAG);
assert.equal((withMag.destinazioneSnapshot as { tipo?: string }).tipo, "magazzino");

const withAltro = applyDestinazioneAltro(withMag);
assert.equal(withAltro.destinazione, "");
assert.equal((withAltro.destinazioneSnapshot as { tipo?: string }).tipo, "altro");
assert.equal(parseOrdineFornitoreDestinatarioSnapshot(withAltro.destinazioneSnapshot, withAltro.destinazione).label, "");

const withAnagrafica = {
  ...withAltro,
  destinazione: "Cantiere X",
  destinazioneSnapshot: {
    tipo: "altro",
    label: "Cliente SPA",
    indirizzo: "Cantiere X",
    partitaIva: "IT999",
  },
};
assert.equal(
  parseOrdineFornitoreDestinatarioSnapshot(withAnagrafica.destinazioneSnapshot, withAnagrafica.destinazione).label,
  "Cliente SPA",
);

const defaulted = defaultNewOrdineDestinazione(empty, MAG);
assert.equal(defaulted.destinazione, MAG);

console.log("ordine-fornitore-destinazione.test.ts OK");
