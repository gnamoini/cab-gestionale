import assert from "node:assert/strict";
import { backfillAddettoIdsInSchedaContenuto } from "@/lib/schede/backfill-scheda-addetto-ids";

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

console.log("schede-addetto-id-migrate.test.ts OK");
