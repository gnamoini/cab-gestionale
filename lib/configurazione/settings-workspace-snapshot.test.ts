import assert from "node:assert/strict";
import { snapshotFromResolved } from "@/lib/configurazione/settings-workspace-snapshot";
import type { CabAppSettingsResolved } from "@/src/lib/app-settings/resolve-from-rows";

const records = [{ id: "id-mario", nome: "Mario", cognome: "Rossi" }];

const resolved: CabAppSettingsResolved = {
  lavorazioni: {
    stati: [{ id: "accettazione", label: "Accettazione", closed: false, color: "#ccc" }],
    addettiRecords: records,
    addetti: ["Mario"],
    addettoColors: { "id-mario": "#2563eb" },
    prioritaColors: {},
    prioritaDb: ["bassa"],
  },
  mezziListe: {
    clienti: [],
    utilizzatori: [],
    cantieri: [],
    marche: [],
    modelli: [],
    tipiAttrezzatura: [],
    stati: [],
    attrezzature: [],
    telai: [],
    tipiTelaio: [],
    scontoRicambiByCliente: {},
  },
  magazzinoMaster: {
    marche: [],
    categorie: [],
    mezziCompatibili: [],
    fornitori: [],
    produttori: [],
  },
  preventiviDefaults: { costoOrarioDefault: 48 },
  dipendenti: { tipiAssenza: [] },
  branding: {
    primaryColor: null,
    logoStoragePath: null,
    companyWebsiteUrl: "https://www.autocompattatori.it",
    updatedAt: null,
  },
};

const snap = snapshotFromResolved(resolved);
assert.equal(snap.addettoColors["id-mario"], "#2563eb", "snapshot mantiene colori keyed per id");

console.log("settings-workspace-snapshot.test.ts OK");
