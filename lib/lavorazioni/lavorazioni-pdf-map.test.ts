import assert from "node:assert/strict";
import { mapLavorazioniListRowsToPdfRows } from "@/lib/lavorazioni/lavorazioni-pdf-map";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

const stati: StatoLavorazioneConfig[] = [
  { id: "attesa_ricambi", label: "Attesa ricambi", color: "#52525b" },
  { id: "in_lavorazione", label: "In lavorazione", color: "#52525b" },
];

function sampleRow(overrides: Partial<LavorazioneListRow> = {}): LavorazioneListRow {
  return {
    id: "lav-001",
    mezzo_id: "mezzo-1",
    stato: "attesa_ricambi",
    priorita: "alta",
    data_ingresso: "2026-05-01T10:00:00.000Z",
    data_uscita: null,
    note: "",
    created_at: "2026-05-01T10:00:00.000Z",
    updated_at: "2026-05-01T10:00:00.000Z",
    archived: false,
    archived_at: null,
    deleted_at: null,
    mezzo: {
      id: "mezzo-1",
      cliente: "Cliente Test",
      marca: "Marca",
      modello: "Modello",
      targa: "AB123CD",
      matricola: "",
      numero_scuderia: "",
    },
    ...overrides,
  } as LavorazioneListRow;
}

const emptyCtx = {
  stati,
  schedeStore: {} as LavorazioneSchedeStore,
};

{
  const [row] = mapLavorazioniListRowsToPdfRows([sampleRow()], emptyCtx);
  assert.equal(row.stato, "Attesa ricambi");
  assert.equal(row.priorita, "Alta");
  assert.equal(row.prioritaSortKey, "alta");
  assert.equal(row.addetto, "—");
}

{
  const schedeStore: LavorazioneSchedeStore = {
    "lav-001": {
      lavorazioneId: "lav-001",
      ingresso: {
        tipo: "ingresso",
        sorgente: "generata",
        createdAt: "",
        updatedAt: "",
        createdBy: "",
        updatedBy: "",
        fileEsterno: null,
        campi: {
          dataIngresso: "",
          cliente: "",
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
          addettoAccettazione: "Mario Rossi",
          richiedente: "",
          noteIntervento: "",
        },
      },
      lavorazioni: null,
      ricambi: null,
    },
  };
  const [row] = mapLavorazioniListRowsToPdfRows([sampleRow()], {
    ...emptyCtx,
    schedeStore,
  });
  assert.equal(row.addetto, "Mario Rossi");
}

{
  const schedeStoreNomeOnly: LavorazioneSchedeStore = {
    "lav-001": {
      lavorazioneId: "lav-001",
      ingresso: {
        tipo: "ingresso",
        sorgente: "generata",
        createdAt: "",
        updatedAt: "",
        createdBy: "",
        updatedBy: "",
        fileEsterno: null,
        campi: {
          dataIngresso: "",
          cliente: "",
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
          addettoAccettazione: "Mario",
          richiedente: "",
          noteIntervento: "",
        },
      },
      lavorazioni: null,
      ricambi: null,
    },
  };
  const [row] = mapLavorazioniListRowsToPdfRows([sampleRow()], {
    ...emptyCtx,
    schedeStore: schedeStoreNomeOnly,
    addettiRecords: [{ id: "a1", nome: "Mario", cognome: "Rossi" }],
  });
  assert.equal(row.addetto, "Mario Rossi", "enrich cognome da settings in PDF");
}

{
  const [row] = mapLavorazioniListRowsToPdfRows([sampleRow()], emptyCtx);
  assert.equal(row.addetto, "—", "no ghost fallback from first active addetto");
}

console.log("lavorazioni-pdf-map.test.ts OK");
