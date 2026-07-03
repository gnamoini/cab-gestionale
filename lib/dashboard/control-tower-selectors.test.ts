import assert from "node:assert/strict";
import {
  buildControlTowerAlertsSlice,
  buildControlTowerHeaderKpiSlice,
  buildControlTowerWipSlice,
  buildControlTowerActivityFeedSlice,
} from "@/lib/dashboard/control-tower-selectors";
import { CONTROL_TOWER_KPI_WINDOW_LABEL, CONTROL_TOWER_STALE_UPDATE_DAYS } from "@/lib/dashboard/control-tower-constants";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import type { LogModificaRow } from "@/src/types/supabase-tables";

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
const totalActivity =
  activity.byDomain.lavorazioni.length +
  activity.byDomain.ricambi.length +
  activity.byDomain.amministrazione.length;
assert.equal(totalActivity, 2, "activity keeps distinct log rows");

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
assert.equal(ricambiActivity.byDomain.ricambi.length, 1, "ricambi activity from magazzino logs");

console.log("control-tower-selectors.test: OK");
