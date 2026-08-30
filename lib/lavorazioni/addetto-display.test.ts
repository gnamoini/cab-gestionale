import assert from "node:assert/strict";
import {


  getAddettoDisplayName,
  getAddettoPillHex,
} from "@/lib/lavorazioni/addetto-display";
import { migrateAddettoColorMapNomeToId } from "@/lib/lavorazioni/addetto-colors-assign";
import {
  normalizePreventivoRigaAddettoWrite,
  stripAddettoLegacyFieldsOnWrite,
  SCHEDA_RIGA_ADDETTO_WRITE_RULES,
} from "@/lib/lavorazioni/addetto-write-freeze";

const records = [
  { id: "id-mario", nome: "Mario", cognome: "Rossi", colorKey: "id-mario" },
  { id: "id-luca", nome: "Luca", cognome: "Bianchi", colorKey: "id-luca" },
];

// display id-first
{
  const name = getAddettoDisplayName(records, { addettoId: "id-mario" });
  assert.equal(name, "Mario Rossi");
}

// legacy fallback
{
  const name = getAddettoDisplayName(records, { addettoLegacy: "Mario" });
  assert.equal(name, "Mario Rossi");
}

// color key stable on rename (id-based map)
{
  const map = migrateAddettoColorMapNomeToId(records, { Mario: "#2563eb" });
  const hexBefore = getAddettoPillHex(records, { addettoId: "id-mario" }, map);
  const renamed = [{ ...records[0]!, nome: "Mario R." }];
  const hexAfter = getAddettoPillHex(renamed, { addettoId: "id-mario" }, map);
  assert.equal(hexBefore, hexAfter, "rename nome non cambia colore");
}

// write freeze strips legacy when id present
{
  const out = stripAddettoLegacyFieldsOnWrite(
    { addettoId: "x", addetto: "Mario" },
    SCHEDA_RIGA_ADDETTO_WRITE_RULES,
  );
  assert.equal(out.addettoId, "x");
  assert.equal("addetto" in out, false);
}

// preventivo normalize
{
  const row = normalizePreventivoRigaAddettoWrite({
    addettoId: "id-mario",
    ore: 2,
    addetto: "Mario",
  });
  assert.equal(row.addettoId, "id-mario");
  assert.equal("addetto" in row, false);
}

console.log("addetto-display.test.ts OK");
