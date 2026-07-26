import assert from "node:assert/strict";
import {
  normalizePreventivoRigaAddettoWrite,
} from "@/lib/lavorazioni/addetto-write-freeze";
import { findAddettoByStoredName } from "@/lib/lavorazioni/addetto-model";

const records = [{ id: "a1", nome: "Marco", cognome: "Rossi", colorKey: "a1" }];

function migrateLegacyRiga(raw: { addetto?: string; ore: number }) {
  const addetto = String(raw.addetto ?? "").trim();
  const rec = addetto ? findAddettoByStoredName(records, addetto) : undefined;
  if (rec) {
    return normalizePreventivoRigaAddettoWrite({ addettoId: rec.id, ore: raw.ore });
  }
  return normalizePreventivoRigaAddettoWrite({
    addettoId: null,
    ore: raw.ore,
    addettoLegacy: addetto,
    legacyWarning: addetto ? `Addetto storico non convertibile: ${addetto}` : undefined,
  });
}

{
  const row = migrateLegacyRiga({ addetto: "Officina", ore: 4 });
  assert.equal(row.addettoId, null);
  assert.equal(row.addettoLegacy, "Officina");
  assert.match(String(row.legacyWarning), /Officina/);
  assert.equal(row.ore, 4);
}

{
  const row = migrateLegacyRiga({ addetto: "Marco", ore: 2 });
  assert.equal(row.addettoId, "a1");
  assert.equal("addettoLegacy" in row, false);
}

console.log("preventivi-officina-migrate.test.ts OK");
