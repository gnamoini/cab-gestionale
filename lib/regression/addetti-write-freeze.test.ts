import assert from "node:assert/strict";
import {
  normalizePreventivoRigaAddettoWrite,
  stripAddettoLegacyFieldsOnWrite,
  SCHEDA_INGRESSO_ADDETTO_WRITE_RULES,
  SCHEDA_RIGA_ADDETTO_WRITE_RULES,
} from "@/lib/lavorazioni/addetto-write-freeze";

{
  const out = stripAddettoLegacyFieldsOnWrite(
    { addettoAccettazioneId: "uuid-1", addettoAccettazione: "Mario" },
    SCHEDA_INGRESSO_ADDETTO_WRITE_RULES,
  );
  assert.equal(out.addettoAccettazioneId, "uuid-1");
  assert.equal("addettoAccettazione" in out, false);
}

{
  const out = stripAddettoLegacyFieldsOnWrite(
    { addettoId: "a1", addetto: "Mario" },
    SCHEDA_RIGA_ADDETTO_WRITE_RULES,
  );
  assert.equal(out.addettoId, "a1");
  assert.equal("addetto" in out, false);
}

{
  const row = normalizePreventivoRigaAddettoWrite({ addettoId: "x", ore: 3, addetto: "legacy" });
  assert.deepEqual(row, { addettoId: "x", ore: 3 });
}

console.log("addetti-write-freeze.test.ts OK");
