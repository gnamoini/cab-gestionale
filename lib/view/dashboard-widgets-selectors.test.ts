import assert from "node:assert/strict";
import {
  computeDashboardLavWidgetRows,
  computeDashboardLavWidgetStats,
  computeDashboardMagDailyMovements,
  computeDashboardMagRecentRicambi,
  computeDashboardMagSottoScortaRicambi,
  computeDashboardMagWidgetStats,
  formatDashboardLavWidgetMezzoIdent,
  formatDashboardMagMovementTime,
  formatDashboardMagRicambioIdent,
  formatDashboardMagRicambioTitle,
  formatDashboardMagScortaDeficit,
} from "@/lib/view/dashboard-widgets-selectors";
import { defaultRicambioMagazzinoFields } from "@/lib/magazzino/ricambio-magazzino-defaults";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MovimentoRicambioRow } from "@/src/types/supabase-tables";

function sampleLav(overrides: Partial<LavorazioneListRow> = {}): LavorazioneListRow {
  return {
    id: "lav-1",
    mezzo_id: "m-1",
    stato: "in_lavorazione",
    priorita: "normale",
    data_ingresso: null,
    data_uscita: null,
    note: null,
    created_by: null,
    created_at: "2026-05-01T10:00:00.000Z",
    updated_at: "2026-05-01T10:00:00.000Z",
    archived: false,
    mezzo: { id: "m-1", marca: "CAT", modello: "320", targa: "AB123", matricola: "M-99", cliente: "Rossi Srl", utilizzatore: null, numero_scuderia: null, created_at: "", updated_at: "" },
    ...overrides,
  } as LavorazioneListRow;
}

const rows = [
  sampleLav({ id: "a", priorita: "normale", updated_at: "2026-05-23T08:00:00.000Z" }),
  sampleLav({ id: "b", priorita: "urgente", updated_at: "2026-05-22T08:00:00.000Z" }),
  sampleLav({ id: "c", priorita: "urgente", updated_at: "2026-05-23T09:00:00.000Z" }),
];

const widgetRows = computeDashboardLavWidgetRows(rows, 4);
assert.deepEqual(
  widgetRows.map((r) => r.id),
  ["c", "b", "a"],
);
assert.ok(widgetRows.every((r) => r.priorita));
assert.equal(widgetRows.filter((r) => r.isUrgent).length, 2);

const withAddetto = computeDashboardLavWidgetRows([sampleLav({ id: "x" })], 4, {
  schedeStore: {
    x: {
      ingresso: {
        campi: { addettoAccettazione: "Mario Rossi" },
      } as never,
    } as never,
  },
});
assert.equal(withAddetto[0]?.addetto, "Mario Rossi");

const lavStats = computeDashboardLavWidgetStats(rows);
assert.equal(lavStats.inCorso, 3);
assert.equal(lavStats.urgenti, 2);
assert.equal(lavStats.entratiOggi, 0);

const todayIso = new Date().toISOString();
const entratiOggi = computeDashboardLavWidgetStats([
  sampleLav({ id: "today", created_at: todayIso, data_ingresso: null }),
  sampleLav({ id: "old", created_at: "2020-01-01T10:00:00.000Z", data_ingresso: null }),
]);
assert.equal(entratiOggi.entratiOggi, 1);
assert.equal(entratiOggi.inCorso, 2);

const mixed = computeDashboardLavWidgetRows(
  [
    sampleLav({ id: "low", priorita: "bassa", updated_at: "2026-05-25T12:00:00.000Z" }),
    sampleLav({ id: "high", priorita: "alta", updated_at: "2026-05-20T12:00:00.000Z" }),
    sampleLav({ id: "mid", priorita: "media", updated_at: "2026-05-24T12:00:00.000Z" }),
  ],
  3,
);
assert.deepEqual(
  mixed.map((r) => r.id),
  ["high", "mid", "low"],
);
assert.equal(
  formatDashboardLavWidgetMezzoIdent({
    cliente: "Specchia",
    matricola: "S NE296",
    nScuderia: "1653",
    targa: "GZ923GX",
  }),
  "Specchia · S NE296 · 1653 · GZ923GX",
);
assert.equal(
  formatDashboardLavWidgetMezzoIdent({ matricola: "M-99", nScuderia: "12", targa: "AB123" }),
  "M-99 · 12 · AB123",
);
assert.equal(formatDashboardLavWidgetMezzoIdent({ matricola: "M-99", targa: "AB123" }), "M-99 · AB123");
assert.equal(formatDashboardLavWidgetMezzoIdent({ matricola: "", targa: "AB123" }), "AB123");
assert.equal(formatDashboardLavWidgetMezzoIdent({ matricola: "—", targa: "" }), null);
assert.equal(formatDashboardMagRicambioIdent("Bucher", "OE-123"), "Bucher · OE-123");
assert.equal(formatDashboardMagRicambioTitle("Bucher", "Ruota Bocca Aspirazione"), "Bucher Ruota Bocca Aspirazione");
assert.equal(formatDashboardMagRicambioTitle("—", "Filtro olio"), "Filtro olio");

const ricambi: RicambioMagazzino[] = [
  defaultRicambioMagazzinoFields({
    id: "r1",
    marca: "OEM",
    codiceFornitoreOriginale: "X1",
    descrizione: "Filtro",
    scorta: 1,
    scortaMinima: 5,
    dataUltimaModifica: "2026-05-20T00:00:00.000Z",
    prezzoFornitoreOriginale: 10,
    prezzoVendita: 10,
  }),
];

assert.equal(computeDashboardMagWidgetStats(ricambi).sottoScorta, 1);
assert.equal(computeDashboardMagWidgetStats(ricambi).capitale, 10);
assert.equal(computeDashboardMagSottoScortaRicambi(ricambi).length, 1);
assert.equal(computeDashboardMagSottoScortaRicambi(ricambi)[0]?.id, "r1");
assert.equal(computeDashboardMagSottoScortaRicambi(ricambi)[0]?.scorta, 1);
assert.equal(computeDashboardMagSottoScortaRicambi(ricambi)[0]?.scortaMinima, 5);
assert.equal(formatDashboardMagScortaDeficit(1, 5), "1 / 5 pz");

const ricambiDeficitSort: RicambioMagazzino[] = [
  defaultRicambioMagazzinoFields({
    id: "mild",
    marca: "A",
    codiceFornitoreOriginale: "A1",
    descrizione: "Mild",
    scorta: 3,
    scortaMinima: 5,
    dataUltimaModifica: "2026-05-25T00:00:00.000Z",
    prezzoFornitoreOriginale: 10,
    prezzoVendita: 10,
  }),
  defaultRicambioMagazzinoFields({
    id: "severe",
    marca: "B",
    codiceFornitoreOriginale: "B1",
    descrizione: "Severe",
    scorta: 0,
    scortaMinima: 10,
    dataUltimaModifica: "2026-05-20T00:00:00.000Z",
    prezzoFornitoreOriginale: 10,
    prezzoVendita: 10,
  }),
];
assert.deepEqual(
  computeDashboardMagSottoScortaRicambi(ricambiDeficitSort).map((r) => r.id),
  ["severe", "mild"],
);

const movementNow = new Date(2026, 5, 9, 15, 30, 0);
assert.equal(
  formatDashboardMagMovementTime("2026-06-09T14:32:00", movementNow),
  "14:32",
);
assert.equal(
  formatDashboardMagMovementTime("2026-06-08T14:32:00", movementNow),
  "08 giu",
);

assert.equal(computeDashboardMagRecentRicambi(ricambi).length, 0);

const ricambiMix: RicambioMagazzino[] = [
  ricambi[0]!,
  {
    ...ricambi[0]!,
    id: "r2",
    scorta: 10,
    scortaMinima: 2,
    dataUltimaModifica: "2026-05-25T00:00:00.000Z",
  },
];
assert.equal(computeDashboardMagSottoScortaRicambi(ricambiMix).length, 1);
assert.equal(computeDashboardMagRecentRicambi(ricambiMix).length, 1);
assert.equal(computeDashboardMagRecentRicambi(ricambiMix)[0]?.id, "r2");

const today = new Date().toISOString();
const movs: MovimentoRicambioRow[] = [
  { id: "m1", ricambio_id: "r1", lavorazione_id: null, tipo: "entrata", quantita: 2, conta_statistiche: true, created_at: today },
  { id: "m2", ricambio_id: "r1", lavorazione_id: null, tipo: "uscita", quantita: 1, conta_statistiche: true, created_at: today },
  { id: "m3", ricambio_id: "r1", lavorazione_id: null, tipo: "entrata", quantita: 1, conta_statistiche: true, created_at: "2020-01-01T00:00:00.000Z" },
];
const daily = computeDashboardMagDailyMovements(movs);
assert.equal(daily.entrate, 2);
assert.equal(daily.uscite, 1);

console.log("dashboard-widgets-selectors.test.ts OK");
