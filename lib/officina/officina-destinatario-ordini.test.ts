import assert from "node:assert/strict";
import {
  officinaDestinatarioOrdiniToAnagrafica,
  parseOfficinaDestinatarioOrdiniSettings,
} from "@/lib/officina/officina-destinatario-ordini";
import { applyDestinazioneMagazzino } from "@/lib/ordini-fornitori/ordine-fornitore-destinazione";
import { buildEmptyOrdineFornitore } from "@/lib/ordini-fornitori/build-empty-ordine-fornitore";
import { parseOrdineFornitoreDestinatarioSnapshot } from "@/lib/ordini-fornitori/destinatario-snapshot";

const settings = parseOfficinaDestinatarioOrdiniSettings({
  label: "CAB SRL",
  partitaIva: "IT123",
  codiceFiscale: "",
  telefono: "",
});

const anag = officinaDestinatarioOrdiniToAnagrafica(settings, "Via Roma 1, Bari");
assert.equal(anag.label, "CAB SRL");
assert.equal(anag.indirizzo, "Via Roma 1, Bari");
assert.equal(anag.telefono, "+39");

const record = applyDestinazioneMagazzino(buildEmptyOrdineFornitore(), "Via Roma 1, Bari", anag);
const snap = parseOrdineFornitoreDestinatarioSnapshot(record.destinazioneSnapshot, record.destinazione);
assert.equal(snap.partitaIva, "IT123");

console.log("officina-destinatario-ordini.test.ts OK");
