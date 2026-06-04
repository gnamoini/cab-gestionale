import assert from "node:assert/strict";
import { buildReportLavorazioniBundle } from "@/lib/report/lavorazioni-report-selectors";
import { ReportDataIntegrityLayer } from "@/lib/report/report-data-integrity-layer";
import { sumMagazzinoUsciteQtyInRange } from "@/lib/report/magazzino-period-aggregate";
import { defaultRicambioMagazzinoFields } from "@/lib/magazzino/ricambio-magazzino-defaults";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";

function mockRow(overrides: Partial<LavorazioneListRow> = {}): LavorazioneListRow {
  return {
    id: "lav-1",
    codice: "L1",
    stato: "da_lavorare",
    priorita: "media",
    data_ingresso: "2025-01-01T00:00:00.000Z",
    archived: false,
    deleted_at: null,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
    mezzo_id: null,
    mezzo: null,
    ...overrides,
  } as LavorazioneListRow;
}

const active = mockRow({ id: "a1", archived: false });
const archivedOpen = mockRow({ id: "c1", archived: true, archived_at: null });
const archivedDone = mockRow({
  id: "c2",
  archived: true,
  archived_at: "2025-02-15T10:00:00.000Z",
});

const bundle = buildReportLavorazioniBundle([active, archivedOpen, archivedDone]);

assert.equal(bundle.attive.length, 1);
assert.equal(bundle.attive[0]?.id, "a1");
assert.ok(bundle.storico.length >= 1);
assert.equal(bundle.completate.length, 1);
assert.equal(bundle.completate[0]?.id, "c2");

const ricambio: RicambioMagazzino = defaultRicambioMagazzinoFields({
  id: "r1",
  marca: "Bosch",
  codiceFornitoreOriginale: "X1",
  descrizione: "Filtro",
  scorta: 5,
  prezzoFornitoreOriginale: 10,
  prezzoVendita: 12,
});

const range = {
  start: startOfLocalDay(new Date("2025-03-01T00:00:00.000Z")),
  end: endOfLocalDay(new Date("2025-03-31T23:59:59.999Z")),
};

const truth = ReportDataIntegrityLayer.buildValidatedDataset({
  lavorazioniRaw: [archivedDone],
  magazzino: [ricambio],
  mezzi: [],
  movimenti: [
    {
      id: "m1",
      ricambio_id: "r1",
      lavorazione_id: "c2",
      tipo: "uscita",
      quantita: 6,
      created_at: "2025-03-18T09:00:00.000Z",
    },
  ],
  manualEntries: [],
});

assert.equal(truth.magLog.length, 1);
assert.equal(sumMagazzinoUsciteQtyInRange(truth.magLog, range), 6, "KPI uscite from movimenti_ricambi");

console.log("report-kpi-bundle.test.ts OK");
