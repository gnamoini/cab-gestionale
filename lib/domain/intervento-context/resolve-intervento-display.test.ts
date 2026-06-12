import assert from "node:assert/strict";
import { composeInterventoContextFromListRow } from "@/lib/domain/intervento-context/build-intervento-context";
import {
  interventoClienteLabel,
  interventoMacchinaLabel,
  interventoMezzoIdentLabel,
  resolveInterventoDisplay,
} from "@/lib/domain/intervento-context/resolve-intervento-display";
import {
  lavorazioneClienteLabel,
  lavorazioneMacchinaLabel,
  lavorazioneMezzoIdent,
} from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

const row: LavorazioneListRow = {
  id: "lav-1",
  mezzo_id: "m-1",
  stato: "accettazione",
  priorita: "media",
  data_ingresso: "2026-01-01",
  data_uscita: null,
  note: null,
  created_by: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  mezzo: {
    id: "m-1",
    cliente: "Cliente Mezzo",
    utilizzatore: "U1",
    marca: "Bobcat",
    modello: "S450",
    targa: "AA111BB",
    matricola: "MAT1",
    numero_scuderia: null,
    tipo_attrezzatura: null,
    anno: 2020,
    meta: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
};

const store: LavorazioneSchedeStore = {
  "lav-1": {
    lavorazioneId: "lav-1",
    codice: null,
    ingresso: {
      tipo: "ingresso",
      sorgente: "generata",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
      createdBy: "A",
      updatedBy: "A",
      fileEsterno: null,
      campi: {
        dataIngresso: "01/01/2026",
        cliente: "Cliente Scheda",
        cantiere: "C1",
        utilizzatore: "U Scheda",
        tipoAttrezzatura: "",
        marcaAttrezzatura: "JCB",
        modelloAttrezzatura: "3CX",
        matricola: "MAT-S",
        nScuderia: "42",
        oreLavoro: "",
        tipoTelaio: "",
        marcaTelaio: "",
        modelloTelaio: "",
        targa: "BB222CC",
        km: "",
        descrizioneAnomalia: "",
        livelloCarburante: "",
        addettoAccettazione: "",
        richiedente: "",
        noteIntervento: "",
      },
    },
    lavorazioni: null,
    ricambi: null,
  },
};

const ctx = composeInterventoContextFromListRow(row, store);
const display = resolveInterventoDisplay(ctx);

assert.equal(interventoMacchinaLabel(display), lavorazioneMacchinaLabel(row, store));
assert.equal(interventoClienteLabel(display), lavorazioneClienteLabel(row, store));
assert.equal(interventoMezzoIdentLabel(display), lavorazioneMezzoIdent(row, store));

const rowNoScheda = { ...row };
const ctxNoScheda = composeInterventoContextFromListRow(rowNoScheda, {});
const displayNoScheda = resolveInterventoDisplay(ctxNoScheda);
assert.equal(interventoMacchinaLabel(displayNoScheda), lavorazioneMacchinaLabel(rowNoScheda, {}));
assert.equal(interventoClienteLabel(displayNoScheda), lavorazioneClienteLabel(rowNoScheda, {}));

console.log("resolve-intervento-display.test.ts: ok");
