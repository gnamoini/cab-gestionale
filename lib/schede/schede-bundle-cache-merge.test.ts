import assert from "node:assert/strict";
import { preferRicherSchedeBundle } from "@/lib/schede/schede-sync-adapter";
import type { LavorazioneSchedeBundle } from "@/types/schede";

const lavId = "lav-merge-1";

const emptyFetched: LavorazioneSchedeBundle = {
  lavorazioneId: lavId,
  codice: null,
  ingresso: null,
  lavorazioni: null,
  ricambi: null,
  _fetchedAt: Date.now(),
};

const localWithAddetto: LavorazioneSchedeBundle = {
  lavorazioneId: lavId,
  codice: null,
  ingresso: {
    tipo: "ingresso",
    sorgente: "generata",
    fileEsterno: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "Test",
    updatedBy: "Test",
    campi: {
      dataIngresso: "01/01/2026",
      cliente: "C",
      cantiere: "",
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
      addettoAccettazione: "",
      addettoAccettazioneId: "addetto-1",
      richiedente: "",
      richiedenteTelefono: "",
    },
  },
  lavorazioni: null,
  ricambi: null,
};

assert.equal(
  preferRicherSchedeBundle(localWithAddetto, emptyFetched).ingresso?.campi.addettoAccettazioneId,
  "addetto-1",
  "local bundle with ingresso addetto wins over empty fetched cache",
);

console.log("schede-bundle-cache-merge.test.ts OK");
