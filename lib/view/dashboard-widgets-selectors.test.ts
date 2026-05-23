import assert from "node:assert/strict";
import {
  computeDashboardLavWidgetRows,
  computeDashboardMagDailyMovements,
  computeDashboardMagWidgetStats,
  formatDashboardLavWidgetSubtitle,
  formatDashboardMagRicambioIdent,
} from "@/lib/view/dashboard-widgets-selectors";
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

const widgetRows = computeDashboardLavWidgetRows(rows, 5);
assert.ok(widgetRows.some((r) => r.id === "c" && r.isUrgent));
assert.ok(widgetRows.some((r) => r.id === "b" && r.isUrgent));
assert.equal(widgetRows.filter((r) => r.isUrgent).length, 2);
assert.equal(formatDashboardLavWidgetSubtitle("Rossi Srl", "AB123"), "Rossi Srl · AB123");
assert.equal(formatDashboardLavWidgetSubtitle("Rossi Srl", "—"), "Rossi Srl");
assert.equal(formatDashboardMagRicambioIdent("Bucher", "OE-123"), "Bucher · OE-123");

const ricambi: RicambioMagazzino[] = [
  {
    id: "r1",
    marca: "OEM",
    codiceFornitoreOriginale: "X1",
    descrizione: "Filtro",
    note: "",
    categoria: "",
    compatibilitaMezzi: [],
    scorta: 1,
    scortaMinima: 5,
    dataUltimaModifica: "2026-05-20T00:00:00.000Z",
    autoreUltimaModifica: "",
    prezzoFornitoreOriginale: 10,
    scontoFornitoreOriginale: 0,
    markupPercentuale: 0,
    prezzoVendita: 10,
    fornitoreNonOriginale: "",
    codiceFornitoreNonOriginale: "",
    prezzoFornitoreNonOriginale: 0,
    scontoFornitoreNonOriginale: 0,
  },
];

assert.equal(computeDashboardMagWidgetStats(ricambi).sottoScorta, 1);
assert.equal(computeDashboardMagWidgetStats(ricambi).capitale, 10);

const today = new Date().toISOString();
const movs: MovimentoRicambioRow[] = [
  { id: "m1", ricambio_id: "r1", lavorazione_id: null, tipo: "entrata", quantita: 2, created_at: today },
  { id: "m2", ricambio_id: "r1", lavorazione_id: null, tipo: "uscita", quantita: 1, created_at: today },
  { id: "m3", ricambio_id: "r1", lavorazione_id: null, tipo: "entrata", quantita: 1, created_at: "2020-01-01T00:00:00.000Z" },
];
const daily = computeDashboardMagDailyMovements(movs);
assert.equal(daily.entrate, 1);
assert.equal(daily.uscite, 1);

console.log("dashboard-widgets-selectors.test.ts OK");
