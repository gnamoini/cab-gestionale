import assert from "node:assert/strict";
import test from "node:test";
import { areConfigurazioneSnapshotsEqual } from "@/lib/configurazione/settings-snapshot-compare";
import type { ConfigurazioneSettingsSnapshot } from "@/lib/configurazione/settings-snapshot-log";

const base = (): ConfigurazioneSettingsSnapshot => ({
  stati: [{ id: "accettazione", label: "Accettazione", closed: false, color: "#ccc" }],
  addettiRecords: [{ id: "a1", nome: "Mario", cognome: null }],
  addettoColors: { Mario: "#ff6633" },
  prioritaColors: {},
  prioritaDb: ["bassa"],
  mag: {
    marche: ["Bosch"],
    scontoFornitoreByMarca: {},
    categorie: [],
    mezziCompatibili: [],
    fornitori: [],
    produttori: [],
  },
  liste: {
    clienti: ["Cliente A"],
    utilizzatori: [],
    cantieri: [],
    marche: [],
    modelli: [],
    tipiAttrezzatura: [],
    stati: [],
    scontoRicambiByCliente: { "cliente a": 5 },
  },
  eco: { costoOrarioDefault: 48 },
  tipiAssenza: [],
  branding: { primaryColor: null, logoStoragePath: null, updatedAt: null },
});

test("areConfigurazioneSnapshotsEqual — stessi dati", () => {
  const a = base();
  const b = structuredClone(a);
  assert.equal(areConfigurazioneSnapshotsEqual(a, b), true);
});

test("areConfigurazioneSnapshotsEqual — ordine chiavi record irrilevante", () => {
  const a = base();
  const b = {
    ...base(),
    liste: {
      ...base().liste,
      scontoRicambiByCliente: { "cliente a": 5 },
    },
  };
  assert.equal(areConfigurazioneSnapshotsEqual(a, b), true);
});

test("areConfigurazioneSnapshotsEqual — differenza eco", () => {
  const a = base();
  const b = { ...base(), eco: { costoOrarioDefault: 50 } };
  assert.equal(areConfigurazioneSnapshotsEqual(a, b), false);
});

test("areConfigurazioneSnapshotsEqual — rename cliente", () => {
  const a = base();
  const b = {
    ...base(),
    liste: {
      ...base().liste,
      clienti: ["Cliente B"],
      scontoRicambiByCliente: {},
    },
  };
  assert.equal(areConfigurazioneSnapshotsEqual(a, b), false);
});
