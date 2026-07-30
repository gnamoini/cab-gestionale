import assert from "node:assert/strict";
import { backfillAddettoIdsInSchedaContenuto } from "@/lib/schede/backfill-scheda-addetto-ids";
import { resolveIngressoAddettoIdForCreate } from "@/lib/schede/schede-addetto-id-migrate";

const records = [{ id: "id-vito", nome: "Vito", cognome: "Rossi", colorKey: "id-vito" }];

{
  const contenuto = {
    doc: {
      campi: { addettoAccettazione: "Vito", addettoAccettazioneId: null },
    },
  };
  const { next, changed } = backfillAddettoIdsInSchedaContenuto(contenuto, "ingresso", records);
  const campi = (next.doc as { campi: { addettoAccettazioneId: string; addettoAccettazione: string } }).campi;
  assert.equal(changed, true);
  assert.equal(campi.addettoAccettazioneId, "id-vito");
  assert.equal(campi.addettoAccettazione, "Vito", "legacy string untouched");
}

assert.equal(
  resolveIngressoAddettoIdForCreate(records, { addettoAccettazione: "Vito", addettoAccettazioneId: "" }),
  "id-vito",
);
assert.equal(
  resolveIngressoAddettoIdForCreate(records, { addettoAccettazione: "", addettoAccettazioneId: "" }),
  "id-vito",
);

console.log("schede-addetto-id-migrate.test.ts OK");
