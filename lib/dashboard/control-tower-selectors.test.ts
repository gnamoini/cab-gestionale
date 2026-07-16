import assert from "node:assert/strict";
import {
  buildControlTowerAlertsSlice,
  buildControlTowerHeaderKpiSlice,
  buildControlTowerWipSlice,
  buildControlTowerActivityFeedSlice,
  pickLavorazioneIdsFromActivityLogs,
} from "@/lib/dashboard/control-tower-selectors";
import { CONTROL_TOWER_KPI_DAY_WINDOW_LABEL, CONTROL_TOWER_KPI_MONTH_WINDOW_LABEL, CONTROL_TOWER_KPI_WINDOW_LABEL, CONTROL_TOWER_STALE_UPDATE_DAYS } from "@/lib/dashboard/control-tower-constants";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";

const ANCHOR = new Date(2026, 5, 4, 12, 0, 0, 0); // gio 4 giu

function lavRow(overrides: Partial<LavorazioneListRow> & { id: string }): LavorazioneListRow {
  return {
    codice: null,
    stato: "in_lavorazione",
    priorita: "media",
    note: null,
    created_at: "2026-06-01T08:00:00.000Z",
    updated_at: "2026-06-04T08:00:00.000Z",
    data_ingresso: "2026-06-01T08:00:00.000Z",
    data_uscita: null,
    archived: false,
    archived_at: null,
    deleted_at: null,
    mezzo_id: null,
    mezzo: null,
    ...overrides,
  } as LavorazioneListRow;
}

const header = buildControlTowerHeaderKpiSlice({
  lavRows: [],
  ricambi: [],
  anchor: ANCHOR,
  includeAdmin: false,
});
assert.equal(header.windowLabel, CONTROL_TOWER_KPI_WINDOW_LABEL);
assert.ok(header.clusters.some((c) => c.id === "lavorazioni"));

function timesheetEntry(partial: Partial<DipendenteTimesheetEntryRow> & Pick<DipendenteTimesheetEntryRow, "work_date" | "ore_ordinarie">): DipendenteTimesheetEntryRow {
  return {
    id: "t1",
    dipendente_id: "d1",
    ore_straordinarie: 0,
    ore_assenza: 0,
    assenza: false,
    tipo_assenza_id: null,
    tipo_assenza_label: null,
    motivo_assenza: null,
    note: null,
    created_at: "",
    updated_at: "",
    employee_display_name_snapshot: "Test",
    employee_source_addetto_id_snapshot: null,
    updated_by: null,
    ...partial,
  };
}

const timesheetHeader = buildControlTowerHeaderKpiSlice({
  lavRows: [],
  ricambi: [],
  anchor: ANCHOR,
  includeAdmin: false,
  includeDipendenti: true,
  timesheetEntries: [
    timesheetEntry({ id: "t1", work_date: "2026-06-02", ore_ordinarie: 8 }),
    timesheetEntry({ id: "t2", work_date: "2026-05-26", ore_ordinarie: 4 }),
  ],
});
const dipCluster = timesheetHeader.clusters.find((c) => c.id === "dipendenti");
assert.ok(dipCluster);
const oreMetric = dipCluster!.metrics.find((m) => m.id === "dip-ore");
assert.equal(oreMetric?.value, 8);
assert.equal(oreMetric?.prevValue, 4);
assert.equal(oreMetric?.unit, "hours");

const dailyHeader = buildControlTowerHeaderKpiSlice({
  lavRows: [],
  ricambi: [],
  anchor: ANCHOR,
  includeAdmin: false,
  includeDipendenti: true,
  briefMode: "day",
  timesheetEntries: [
    timesheetEntry({ id: "t1", work_date: "2026-06-04", ore_ordinarie: 6 }),
    timesheetEntry({ id: "t2", work_date: "2026-06-02", ore_ordinarie: 8 }),
  ],
});
assert.equal(dailyHeader.windowLabel, CONTROL_TOWER_KPI_DAY_WINDOW_LABEL);
const dailyDip = dailyHeader.clusters.find((c) => c.id === "dipendenti");
assert.ok(dailyDip);
const dailyOre = dailyDip!.metrics.find((m) => m.id === "dip-ore");
assert.equal(dailyOre?.value, 6);
assert.equal(dailyOre?.prevValue, null);
assert.equal(dailyOre?.deltaPct, null);
assert.equal(oreMetric?.deltaAbs, "+4");
assert.equal(oreMetric?.deltaPct, 100);

const monthlyHeader = buildControlTowerHeaderKpiSlice({
  lavRows: [],
  ricambi: [],
  anchor: ANCHOR,
  includeAdmin: false,
  includeDipendenti: true,
  briefMode: "month",
  timesheetEntries: [
    timesheetEntry({ id: "t1", work_date: "2026-06-02", ore_ordinarie: 8 }),
    timesheetEntry({ id: "t2", work_date: "2026-05-02", ore_ordinarie: 4 }),
    timesheetEntry({ id: "t3", work_date: "2026-05-26", ore_ordinarie: 99 }),
  ],
});
assert.equal(monthlyHeader.windowLabel, CONTROL_TOWER_KPI_MONTH_WINDOW_LABEL);
const monthlyDip = monthlyHeader.clusters.find((c) => c.id === "dipendenti");
assert.ok(monthlyDip);
const monthlyOre = monthlyDip!.metrics.find((m) => m.id === "dip-ore");
assert.equal(monthlyOre?.value, 8);
assert.equal(monthlyOre?.prevValue, 4);
assert.equal(monthlyOre?.deltaAbs, "+4");
assert.equal(monthlyOre?.deltaPct, 100);

const staleLav = lavRow({
  id: "stale-1",
  updated_at: "2026-05-20T08:00:00.000Z",
  data_ingresso: "2026-05-15T08:00:00.000Z",
});
const alerts = buildControlTowerAlertsSlice({ lavRows: [staleLav], ricambi: [], anchor: ANCHOR });
assert.ok(alerts.items.some((a) => a.id === "lav-stale"));
assert.ok(alerts.items.some((a) => a.title.includes(String(CONTROL_TOWER_STALE_UPDATE_DAYS))));

const wip = buildControlTowerWipSlice({ lavRows: [staleLav], ricambi: [], anchor: ANCHOR });
const wipIds = wip.buckets.flatMap((b) => b.groups.flatMap((g) => g.rows.map((r) => r.id)));
assert.equal(wipIds.includes("stale-1"), false, "alert lav excluded from WIP rows");

const logs: LogModificaRow[] = [
  {
    id: "1",
    entita: "lavorazioni",
    entita_id: "x",
    azione: "UPDATE",
    created_at: "2026-06-03T10:00:00.000Z",
    payload: { before: { stato: "accettazione" }, after: { stato: "in_lavorazione" } },
    autore_id: null,
  },
  {
    id: "1b",
    entita: "lavorazioni",
    entita_id: "x",
    azione: "UPDATE",
    created_at: "2026-06-03T11:00:00.000Z",
    payload: { before: { priorita: "media" }, after: { priorita: "alta" } },
    autore_id: null,
  },
  {
    id: "2",
    entita: "lavorazioni",
    entita_id: "y",
    azione: "UPDATE",
    created_at: "2026-06-02T10:00:00.000Z",
    payload: { before: { priorita: "media" }, after: { priorita: "alta" } },
    autore_id: null,
  },
];
const activity = buildControlTowerActivityFeedSlice({
  lavRows: [],
  ricambi: [],
  logLavorazioni: logs,
  anchor: ANCHOR,
});
assert.equal(activity.byDomain.lavorazioni.length, 2, "activity groups logs by entity");
assert.equal(activity.byDomain.lavorazioni[0]?.eventCount, 2, "merged entity keeps event count");

const ricambiLogs = [
  {
    id: "3",
    entita: "magazzino_ricambi",
    entita_id: "ric-1",
    azione: "UPDATE",
    created_at: "2026-06-03T09:00:00.000Z",
    payload: { before: { scorta: 2 }, after: { scorta: 5 } },
    autore_id: null,
  },
];
const ricambiActivity = buildControlTowerActivityFeedSlice({
  lavRows: [],
  ricambi: [],
  logMagazzino: ricambiLogs,
  anchor: ANCHOR,
});
assert.equal(ricambiActivity.byDomain.magazzino.length, 1, "magazzino activity from magazzino logs");

const invoiceLogs: LogModificaRow[] = [
  {
    id: "inv-1",
    entita: "invoices",
    entita_id: "inv-x",
    azione: "UPDATE",
    created_at: "2026-06-03T14:00:00.000Z",
    payload: { before: { status: "bozza" }, after: { status: "emessa" } },
    autore_id: null,
  },
];
const fatturazioneActivity = buildControlTowerActivityFeedSlice({
  lavRows: [],
  ricambi: [],
  logFatturazione: invoiceLogs,
  anchor: ANCHOR,
});
assert.equal(fatturazioneActivity.byDomain.fatturazione.length, 1, "fatturazione from invoices entita");

const schedaLogs: LogModificaRow[] = [
  {
    id: "sch-1",
    entita: "scheda_lavorazione",
    entita_id: "scheda-1",
    azione: "UPDATE",
    created_at: "2026-06-03T12:00:00.000Z",
    payload: {
      before: { lavorazione_id: "lav-1", note: "a" },
      after: { lavorazione_id: "lav-1", note: "b" },
    },
    autore_id: null,
  },
];
const mergedLavActivity = buildControlTowerActivityFeedSlice({
  lavRows: [lavRow({ id: "lav-1", codice: "L-001" })],
  ricambi: [],
  logLavorazioni: [...logs, ...schedaLogs],
  anchor: ANCHOR,
});
assert.equal(mergedLavActivity.byDomain.lavorazioni.length, 3, "distinct lavorazioni stay separate when not same lav id");

const lavSchedaMergedLogs: LogModificaRow[] = [
  {
    id: "lav-1a",
    entita: "lavorazioni",
    entita_id: "lav-1",
    azione: "UPDATE",
    created_at: "2026-06-03T10:00:00.000Z",
    payload: { before: { stato: "accettazione" }, after: { stato: "in_lavorazione" } },
    autore_id: null,
  },
  {
    id: "lav-1b",
    entita: "lavorazioni",
    entita_id: "lav-1",
    azione: "UPDATE",
    created_at: "2026-06-03T11:00:00.000Z",
    payload: { before: { priorita: "media" }, after: { priorita: "alta" } },
    autore_id: null,
  },
  {
    id: "sch-lav-1",
    entita: "scheda_lavorazione",
    entita_id: "scheda-1",
    azione: "UPDATE",
    created_at: "2026-06-03T12:00:00.000Z",
    payload: {
      before: { lavorazione_id: "lav-1", note: "a" },
      after: { lavorazione_id: "lav-1", note: "b" },
    },
    autore_id: null,
  },
];
const lavSchedaMergedActivity = buildControlTowerActivityFeedSlice({
  lavRows: [lavRow({ id: "lav-1", codice: "L-001" })],
  ricambi: [],
  logLavorazioni: lavSchedaMergedLogs,
  anchor: ANCHOR,
});
assert.equal(lavSchedaMergedActivity.byDomain.lavorazioni.length, 1, "lavorazioni + scheda merge by lavorazione_id");
assert.equal(lavSchedaMergedActivity.byDomain.lavorazioni[0]?.eventCount, 3, "merged lav+scheda event count");

const oldLog: LogModificaRow = {
  id: "old-1",
  entita: "lavorazioni",
  entita_id: "old-lav",
  azione: "UPDATE",
  created_at: "2026-05-01T10:00:00.000Z",
  payload: { before: { note: "a" }, after: { note: "b" } },
  autore_id: null,
};
const outsideWindowActivity = buildControlTowerActivityFeedSlice({
  lavRows: [],
  ricambi: [],
  logLavorazioni: [oldLog],
  anchor: ANCHOR,
});
assert.equal(outsideWindowActivity.byDomain.lavorazioni.length, 1, "activity not filtered by rolling 7d window");

const pickIds = pickLavorazioneIdsFromActivityLogs(
  [
    { id: "a", entita: "lavorazioni", entita_id: "lav-2", azione: "UPDATE", created_at: "2026-06-03T10:00:00.000Z", payload: {}, autore_id: null },
    { id: "b", entita: "lavorazioni", entita_id: "lav-1", azione: "UPDATE", created_at: "2026-06-04T10:00:00.000Z", payload: {}, autore_id: null },
    { id: "c", entita: "lavorazioni", entita_id: "lav-2", azione: "UPDATE", created_at: "2026-06-05T10:00:00.000Z", payload: {}, autore_id: null },
  ],
  2,
);
assert.deepEqual(pickIds, ["lav-2", "lav-1"], "schede prefetch ids from latest activity per macchina");

const magLogEntry: MagazzinoChangeLogEntry = {
  id: "local-1",
  tipo: "rimozione",
  ricambioId: "ric-1",
  ricambio: "Filtro",
  autore: "Test",
  at: "2026-06-03T10:00:00.000Z",
  riepilogo: "Scarico",
  changes: [{ campo: "Scorta", prima: "5", dopo: "3" }],
  annullato: false,
};
const movimentiLogs: LogModificaRow[] = [
  {
    id: "mov-1",
    entita: "movimenti_ricambi",
    entita_id: "m1",
    azione: "CREATE",
    created_at: "2026-06-03T11:00:00.000Z",
    payload: { snapshot: { tipo: "uscita", ricambio_id: "ric-1", quantita: 2 } },
    autore_id: null,
  },
];
const magHeader = buildControlTowerHeaderKpiSlice({
  lavRows: [],
  ricambi: [
    {
      id: "ric-1",
      descrizione: "Filtro",
      codiceFornitoreOriginale: "F-1",
      marca: "Test",
      scorta: 3,
      scortaMinima: 2,
      dataUltimaModifica: "2026-06-01T00:00:00.000Z",
    } as import("@/lib/magazzino/types").RicambioMagazzino,
  ],
  anchor: ANCHOR,
  includeAdmin: false,
  magLog: [magLogEntry],
  movimentiLogs,
});
const ricCluster = magHeader.clusters.find((c) => c.id === "ricambi");
assert.ok(ricCluster);
assert.equal(ricCluster!.metrics.find((m) => m.id === "mag-movimenti")?.value, 1);
assert.equal(ricCluster!.metrics.find((m) => m.id === "mag-consumi")?.value, 2);

console.log("control-tower-selectors.test: OK");
