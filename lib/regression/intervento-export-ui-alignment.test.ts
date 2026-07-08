/**
 * Export/UI alignment: canonical export deve riflettere read SSOT (scheda > lav > mezzo).
 */
import assert from "node:assert/strict";
import { resolveInterventoCanonical } from "@/lib/domain/intervento-context/resolve-intervento-canonical";
import { anagraficaFromSchedaIngresso } from "@/lib/preventivi/preventivo-anagrafica-map";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MezzoRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeBundle, LavorazioneSchedeStore } from "@/types/schede";

const mezzo: MezzoRow = {
  id: "m-1",
  cliente: "Cliente Mezzo",
  utilizzatore: "Util Mezzo",
  marca: "MarcaMezzo",
  modello: "ModelloMezzo",
  targa: "MEZZO99",
  matricola: "MAT-MEZZO",
  numero_scuderia: "SC-1",
  tipo_attrezzatura: "TipoM",
  anno: null,
  entity_key: null,
} as MezzoRow;

const row: LavorazioneListRow = {
  id: "lav-1",
  codice: "26-0001",
  mezzo_id: "m-1",
  stato: "accettazione",
  priorita: "media",
  data_ingresso: "2026-06-01",
  note: null,
  mezzo,
} as LavorazioneListRow;

const bundle: LavorazioneSchedeBundle = {
  lavorazioneId: "lav-1",
  codice: "26-0001",
  ingresso: {
    tipo: "ingresso",
    sorgente: "generata",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    createdBy: "tester",
    updatedBy: "tester",
    fileEsterno: null,
    campi: {
      dataIngresso: "01/06/2026",
      cliente: "Cliente Scheda Stale",
      cantiere: "",
      utilizzatore: "",
      tipoAttrezzatura: "",
      marcaAttrezzatura: "MarcaScheda",
      modelloAttrezzatura: "ModelloScheda",
      matricola: "MAT-SCHEDA",
      nScuderia: "",
      oreLavoro: "",
      tipoTelaio: "",
      marcaTelaio: "",
      modelloTelaio: "",
      vin: "",
      targa: "SCHEDA99",
      km: "",
      descrizioneAnomalia: "Anomalia test",
      livelloCarburante: "",
      addettoAccettazione: "Mario",
      richiedente: "",
    richiedenteTelefono: "",
      noteIntervento: "",
    },
  },
  lavorazioni: null,
  ricambi: null,
};

const store: LavorazioneSchedeStore = { "lav-1": bundle };

function run(): void {
  const ui = resolveInterventoCanonical("ui", { lavorazioneRow: row, schedeStore: store });
  const exp = resolveInterventoCanonical("export", {
    lavorazioneRow: row,
    schedeStore: store,
    ingressoCampi: bundle.ingresso!.campi,
  });

  assert.equal(ui.display.cliente.value, "Cliente Scheda Stale");
  assert.equal(exp.exportFields.cliente, "Cliente Scheda Stale");
  assert.equal(exp.exportFields.descrizioneAnomalia, "Anomalia test");

  const prev = anagraficaFromSchedaIngresso(exp.exportFields);
  assert.equal(prev.cliente, ui.display.cliente.value);
  assert.equal(prev.targa, ui.display.targa.value);
  assert.equal(prev.marcaAttrezzatura, "MarcaScheda");
}

run();
console.log("intervento-export-ui-alignment.test.ts OK");
