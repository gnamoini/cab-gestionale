import assert from "node:assert/strict";
import {
  buildConfigurazioneLogEntriesFromSnapshotDiff,
  type ConfigurazioneSettingsSnapshot,
} from "@/lib/configurazione/settings-snapshot-log";

const base = (): ConfigurazioneSettingsSnapshot => ({
  stati: [],
  addettiRecords: [{ id: "a1", nome: "Mario", cognome: null }],
  addettoColors: {},
  prioritaColors: {},
  prioritaDb: [],
  mag: {
    marche: ["X"],
    scontoFornitoreByMarca: {},
    categorie: [],
    mezziCompatibili: [],
    fornitori: [],
  },
  liste: {
    clienti: ["C1"],
    utilizzatori: [],
    cantieri: [],
    marche: [],
    modelli: [],
    tipiAttrezzatura: [],
    stati: [],
  },
  eco: { costoOrarioDefault: 40 },
  tipiAssenza: [],
});

{
  const before = base();
  const after = { ...before, eco: { costoOrarioDefault: 42 } };
  const entries = buildConfigurazioneLogEntriesFromSnapshotDiff(before, after, "Test");
  assert.equal(entries.length, 1);
  assert.match(entries[0]!.oggettoRiga, /Parametri economici/);
}

{
  const before = base();
  const after = base();
  const entries = buildConfigurazioneLogEntriesFromSnapshotDiff(before, after, "Test");
  assert.equal(entries.length, 1);
  assert.equal(entries[0]!.oggettoRiga, "Configurazione globale");
}

console.log("settings-snapshot-log.test.ts OK");
