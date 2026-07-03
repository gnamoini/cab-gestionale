import assert from "node:assert/strict";
import {
  addettiLegacyNomi,
  addettoDisplayName,
  addettoDisplayNameFromNome,
  migrateLegacyAddettiStrings,
  parseAddettiRecordsFromPayload,
  syncLavorazioniAddettiFromRecords,
} from "@/lib/lavorazioni/addetto-model";

// displayName con cognome
{
  assert.equal(addettoDisplayName({ nome: "Marco", cognome: "Rossi" }), "Marco Rossi");
}

// displayName senza cognome
{
  assert.equal(addettoDisplayName({ nome: "Marco Rossi", cognome: null }), "Marco Rossi");
}

// displayNameFromNome con record
{
  const records = [{ id: "v", nome: "Vito", cognome: "Rossi" }];
  assert.equal(addettoDisplayNameFromNome(records, "Vito"), "Vito Rossi");
  assert.equal(addettoDisplayNameFromNome(records, "Sconosciuto"), "Sconosciuto");
}

// proiezione legacy nomi
{
  const nomi = addettiLegacyNomi([
    { id: "a", nome: "Marco", cognome: "Rossi" },
    { id: "b", nome: "Luca", cognome: null },
  ]);
  assert.deepEqual(nomi, ["Marco", "Luca"]);
}

// parse legacy string array migration
{
  const records = migrateLegacyAddettiStrings(["Marco Rossi", "Luca"]);
  assert.equal(records.length, 2);
  assert.equal(records[0]?.nome, "Marco Rossi");
  assert.equal(records[0]?.cognome, null);
}

// parse addettiRecords payload
{
  const parsed = parseAddettiRecordsFromPayload([
    { id: "id-1", nome: "Marco", cognome: "Rossi" },
  ]);
  assert.equal(parsed?.length, 1);
  assert.equal(parsed?.[0]?.id, "id-1");
}

// sync keeps addetti in sync
{
  const synced = syncLavorazioniAddettiFromRecords([{ id: "x", nome: "A", cognome: "B" }]);
  assert.deepEqual(synced.addetti, ["A"]);
  assert.equal(synced.addettiRecords[0]?.cognome, "B");
}

console.log("addetto-model.test.ts OK");
