import assert from "node:assert/strict";
import {
  ReportDataIntegrityLayer,
  CACHE_DRIFT_WARN_MS,
  detectCacheDrift,
} from "@/lib/report/report-data-integrity-layer";
import { defaultRicambioMagazzinoFields } from "@/lib/magazzino/ricambio-magazzino-defaults";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

const ricambio: RicambioMagazzino = defaultRicambioMagazzinoFields({
  id: "r1",
  marca: "Bosch",
  codiceFornitoreOriginale: "X1",
  descrizione: "Filtro",
  scorta: 5,
  prezzoFornitoreOriginale: 10,
  prezzoVendita: 12,
});

const baseInput = {
  lavorazioniRaw: [],
  magazzino: [ricambio],
  mezzi: [],
  movimenti: [
    {
      id: "m1",
      ricambio_id: "r1",
      lavorazione_id: null,
      tipo: "uscita" as const,
      quantita: 2,
      created_at: "2025-03-10T12:00:00.000Z",
    },
  ],
  manualEntries: [],
};

const ok = ReportDataIntegrityLayer.buildValidatedDataset(baseInput);
assert.equal(ok.status, "ok");
assert.equal(ok.magLog.length, 1);

const degraded = ReportDataIntegrityLayer.buildValidatedDataset({
  ...baseInput,
  queryMeta: [
    {
      source: "magazzino",
      isError: true,
      isFetching: false,
      dataUpdatedAt: Date.now(),
      rowCount: 0,
    },
    {
      source: "lavorazioni",
      isError: false,
      isFetching: false,
      dataUpdatedAt: Date.now(),
      rowCount: 0,
    },
  ],
});
assert.equal(degraded.status, "degraded");
assert.equal(degraded.magazzino.length, 0);

const drift = detectCacheDrift([
  {
    source: "lavorazioni",
    isError: false,
    isFetching: false,
    dataUpdatedAt: 1_000,
    rowCount: 1,
  },
  {
    source: "magazzino",
    isError: false,
    isFetching: false,
    dataUpdatedAt: 1_000 + CACHE_DRIFT_WARN_MS + 1_000,
    rowCount: 1,
  },
]);
assert.ok(drift.findings.some((f) => f.code === "cache_drift"));

console.log("report-data-integrity-layer.test.ts OK");
