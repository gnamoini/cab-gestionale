import assert from "node:assert/strict";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { buildLavorazioniYearMatrix, yearlyForecastLineModel } from "@/lib/report/lavorazioni-year-matrix";

function mockArchived(dataCompletamento: string): LavorazioneArchiviata {
  return {
    id: "a1",
    macchina: "X",
    targa: "—",
    matricola: "—",
    nScuderia: "",
    cliente: "C",
    utilizzatore: "—",
    cantiere: "",
    addetto: "—",
    note: "",
    statoFinaleId: "completata",
    prioritaFinale: "media",
    dataIngresso: "2024-12-01T10:00:00.000Z",
    dataCompletamento,
    meseCompletamento: dataCompletamento.slice(0, 7),
  };
}

const anchor = new Date(2025, 5, 15);
const { rows, manualMonthKeys } = buildLavorazioniYearMatrix(
  [mockArchived("2025-02-10T12:00:00.000Z")],
  anchor,
  new Map([["2025-01", 10]]),
);

const feb2025 = rows.find((r) => r.year === 2025);
assert.equal(feb2025?.months[1], 1, "Feb from DB");
assert.equal(feb2025?.months[0], 10, "Jan from manual override");
assert.ok(manualMonthKeys.has("2025-01"));

const manualOnly = buildLavorazioniYearMatrix([], anchor, new Map([["2017-04", 23], ["2018-05", 37]]));
assert.ok(manualOnly.rows.some((r) => r.year === 2017));
assert.equal(manualOnly.rows.find((r) => r.year === 2017)?.months[3], 23);
assert.equal(
  buildLavorazioniYearMatrix([mockArchived("2025-02-10T12:00:00.000Z")], anchor, new Map([["2025-01", 99]])).rows.find(
    (r) => r.year === 2025,
  )?.months[0],
  99,
  "manual overrides automatic for same month",
);

const forecastRows = [
  {
    year: 2024,
    months: Array.from({ length: 12 }, () => 0),
    total: 500,
    growthVsPrevPct: null,
    bestMonthIdx: null,
    worstMonthIdx: null,
  },
  {
    year: 2025,
    months: Array.from({ length: 12 }, () => 0),
    total: 400,
    growthVsPrevPct: null,
    bestMonthIdx: null,
    worstMonthIdx: null,
  },
  {
    year: 2026,
    months: Array.from({ length: 12 }, () => 0),
    total: 312,
    growthVsPrevPct: null,
    bestMonthIdx: null,
    worstMonthIdx: null,
  },
];
const forecast = yearlyForecastLineModel(forecastRows, new Date(2026, 6, 20));
assert.equal(forecast.dashed.length, 2);
assert.equal(forecast.dashed[0]?.year, 2025);
assert.equal(forecast.dashed[0]?.kind, "history");
assert.equal(forecast.dashed[1]?.year, 2026);
assert.equal(forecast.dashed[1]?.kind, "forecast");
assert.equal(forecast.dashed[1]?.x, forecast.dashed[0]!.x + 1, "forecast spans prev year → current year");

assert.equal(
  buildLavorazioniYearMatrix([mockArchived("2026-07-15T12:00:00.000Z")], new Date(2026, 7, 20), new Map([["2026-07", 99]]), undefined)
    .rows.find((r) => r.year === 2026)?.months[6],
  99,
  "override Excel non-zero sul mese",
);

assert.equal(
  buildLavorazioniYearMatrix(
    [mockArchived("2026-08-12T12:00:00.000Z")],
    new Date(2026, 7, 20),
    new Map([["2026-08", 0]]),
    undefined,
  ).rows.find((r) => r.year === 2026)?.months[7],
  1,
  "ago senza override usa DB live",
);

console.log("lavorazioni-year-matrix.test.ts OK");
