import assert from "node:assert/strict";
import { listSchedaIngressoUnknownSettings } from "@/lib/schede/scheda-ingresso-unknown-settings";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { SchedaIngressoFields } from "@/types/schede";

const opts = {
  isLoading: false,
  isError: false,
  error: null,
  source: "fallback" as const,
  lavorazioni: {
    stati: [],
    statiInCorso: [],
    statiChiusi: [],
    statiRapidi: [],
    addetti: ["Mario Rossi"],
    addettiRecords: [{ id: "a1", nome: "Mario Rossi", cognome: null }],
    addettoColors: {},
    prioritaColors: {},
    prioritaDb: ["media"] as const,
    prioritaLegacy: [],
  },
  mezziListe: {
    clienti: ["Cliente Esistente"],
    utilizzatori: [],
    cantieri: ["Cantiere A"],
    marche: ["Marca X"],
    modelli: [],
    tipiAttrezzatura: [],
    stati: [],
    tipiTelaio: [],
    telai: [],
  },
  magazzinoMaster: {
    categorie: [],
    marche: [],
    fornitori: [],
    mezziCompatibili: [],
    produttori: [],
  },
  preventiviDefaults: { costoOrarioDefault: 48 },
  dipendenti: { tipiAssenza: [] },
};

const fields: SchedaIngressoFields = {
  dataIngresso: "01/01/2026",
  cliente: "Nuovo Cliente SRL",
  cantiere: "Cantiere A",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "",
  modelloAttrezzatura: "",
  matricola: "",
  nScuderia: "",
  oreLavoro: "",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  vin: "",
  targa: "",
  km: "",
  descrizioneAnomalia: "",
  livelloCarburante: "",
  addettoAccettazione: "Nuovo Addetto",
  richiedente: "",
  richiedenteTelefono: "",
};

const unknown = listSchedaIngressoUnknownSettings(fields, opts as unknown as GlobalOptionsSlice);
assert.equal(unknown.length, 2);
assert.ok(unknown.some((u) => u.label === "Cliente" && u.value === "Nuovo Cliente SRL"));
assert.ok(unknown.some((u) => u.label === "Addetto accettazione" && u.value === "Nuovo Addetto"));
assert.ok(!unknown.some((u) => u.label === "Cantiere"));

console.log("scheda-ingresso-unknown-settings.test.ts OK");
