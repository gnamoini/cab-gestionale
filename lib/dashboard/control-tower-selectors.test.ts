import assert from "node:assert/strict";
import {
  buildControlTowerAlertsSlice,
  buildControlTowerHeaderKpiSlice,
  buildControlTowerWipSlice,
  buildControlTowerActivityFeedSlice,
} from "@/lib/dashboard/control-tower-selectors";
import { CONTROL_TOWER_KPI_WINDOW_LABEL, CONTROL_TOWER_STALE_UPDATE_DAYS } from "@/lib/dashboard/control-tower-constants";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
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
    payload: {},
    autore_id: null,
  },
  {
    id: "2",
    entita: "lavorazioni",
    entita_id: "x",
    azione: "UPDATE",
    created_at: "2026-06-02T10:00:00.000Z",
    payload: {},
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
  activity.byDomain.magazzino.length +
  activity.byDomain.amministrazione.length;
assert.equal(totalActivity, 1, "activity dedup entity+action");

console.log("control-tower-selectors.test: OK");
