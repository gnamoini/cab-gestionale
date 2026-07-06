import assert from "node:assert/strict";
import { filterReportLavorazioniRows } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { defaultRicambioMagazzinoFields } from "@/lib/magazzino/ricambio-magazzino-defaults";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { sumMagazzinoUsciteQtyInRange } from "@/lib/report/magazzino-period-aggregate";
import { ReportDataIntegrityLayer } from "@/lib/report/report-data-integrity-layer";
import { filterMovimentiForReport } from "@/lib/report/report-truth-dataset";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MovimentoRicambioRow } from "@/src/types/supabase-tables";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";

const range = {
  start: startOfLocalDay(new Date("2025-03-01T00:00:00.000Z")),
  end: endOfLocalDay(new Date("2025-03-31T23:59:59.999Z")),
};

function mockLav(over: Partial<LavorazioneListRow> = {}): LavorazioneListRow {
  return {
    id: "lav-1",
    mezzo_id: "mezzo-1",
    stato: "da_lavorare",
    priorita: "media",
    data_ingresso: "2025-01-10T10:00:00.000Z",
    data_uscita: null,
    note: null,
    created_by: null,
    created_at: "2025-01-10T10:00:00.000Z",
    updated_at: "2025-06-01T12:00:00.000Z",
    archived: false,
    archived_at: null,
    deleted_at: null,
    mezzo: null,
    ...over,
  };
}

function mockMezzo(over: Partial<MezzoGestito> = {}): MezzoGestito {
  return {
    id: "mezzo-1",
    cliente: "ACME",
    utilizzatore: "",
    cantiere: "",
    marca: "CAT",
    modello: "320",
    marcaTelaio: "",
    modelloTelaio: "",
    vin: "",
    targa: "",
    matricola: "",
    numeroScuderia: "",
    tipoAttrezzatura: "Escavatore",
    anno: 2020,
    oreKm: 1200,
    statoAttuale: "operativo",
    dataUltimaUscita: "2025-01-01T00:00:00.000Z",
    note: "",
    priorita: "normale",
    hubSynthetic: false,
    ...over,
  };
}

const ricambio: RicambioMagazzino = defaultRicambioMagazzinoFields({
  id: "r1",
  marca: "Bosch",
  codiceFornitoreOriginale: "X1",
  descrizione: "Filtro",
  scorta: 5,
  prezzoFornitoreOriginale: 10,
  prezzoVendita: 12,
});

const validMezzi = new Set(["mezzo-1"]);
const orphan = filterReportLavorazioniRows(
  [mockLav({ id: "orphan", mezzo_id: "missing-mezzo", mezzo: null })],
  validMezzi,
);
assert.equal(orphan.rows.length, 0);
assert.equal(orphan.excludedCount, 1);

const validRicambi = new Set(["r1"]);
const validLav = new Set(["lav-1"]);
const movFiltered = filterMovimentiForReport(
  [
    {
      id: "m1",
      ricambio_id: "r-deleted",
      lavorazione_id: null,
      tipo: "uscita",
      quantita: 2,
      created_at: "2025-03-10T12:00:00.000Z",
    } satisfies MovimentoRicambioRow,
    {
      id: "m2",
      ricambio_id: "r1",
      lavorazione_id: "lav-gone",
      tipo: "uscita",
      quantita: 1,
      created_at: "2025-03-11T12:00:00.000Z",
    } satisfies MovimentoRicambioRow,
    {
      id: "m3",
      ricambio_id: "r1",
      lavorazione_id: "lav-1",
      tipo: "uscita",
      quantita: 4,
      created_at: "2025-03-12T12:00:00.000Z",
    } satisfies MovimentoRicambioRow,
  ],
  validRicambi,
  validLav,
);
assert.equal(movFiltered.rows.length, 1);
assert.equal(movFiltered.rows[0]?.id, "m3");
assert.equal(movFiltered.excludedCount, 2);

const dataset = ReportDataIntegrityLayer.buildValidatedDataset({
  lavorazioniRaw: [
    mockLav({ id: "lav-1", deleted_at: "2025-05-01T00:00:00.000Z" }),
    mockLav({
      id: "lav-2",
      archived: true,
      archived_at: "2025-03-15T08:00:00.000Z",
      mezzo_id: "mezzo-1",
    }),
  ],
  magazzino: [ricambio],
  mezzi: [mockMezzo()],
  movimenti: [
    {
      id: "m-valid",
      ricambio_id: "r1",
      lavorazione_id: "lav-2",
      tipo: "uscita",
      quantita: 7,
      created_at: "2025-03-20T10:00:00.000Z",
    },
  ],
  manualEntries: [],
});

assert.equal(dataset.completate.length, 1);
assert.equal(dataset.completate[0]?.id, "lav-2");
assert.equal(dataset.magLog.length, 1);
assert.equal(sumMagazzinoUsciteQtyInRange(dataset.magLog, range), 7);

console.log("report-truth-dataset.test.ts OK");
