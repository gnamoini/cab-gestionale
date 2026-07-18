import assert from "node:assert/strict";
import {
  buildControlTowerActivityFeedSlice,
  splitLogsIntoTimeBursts,
} from "@/lib/dashboard/control-tower-selectors";
import { reconcileLogModificaRows } from "@/lib/gestionale-log/log-event-pipeline";
import { LOG_AGGREGATION_WINDOW_MS } from "@/lib/gestionale-log/log-event-pipeline";
import { CONTROL_TOWER_ACTIVITY_PER_CARD } from "@/lib/dashboard/control-tower-constants";
import type { LogModificaRow } from "@/src/types/supabase-tables";

function lavUpdate(id: string, lavId: string, at: string, field: string, from: string, to: string): LogModificaRow {
  return {
    id,
    entita: "lavorazioni",
    entita_id: lavId,
    azione: "UPDATE",
    created_at: at,
    payload: { before: { [field]: from }, after: { [field]: to } },
    autore_id: "user-1",
  };
}

/** SSOT: burst timestamps attesi dai log grezzi (stessa finestra del feed builder). */
function expectedBurstTimestamps(logs: readonly LogModificaRow[]): string[] {
  const reconciled = reconcileLogModificaRows(logs);
  const byKey = new Map<string, LogModificaRow[]>();
  for (const row of reconciled) {
    const key = row.entita === "lavorazioni" ? `lavorazione:${row.entita_id}` : `${row.entita}:${row.entita_id}`;
    const list = byKey.get(key) ?? [];
    list.push(row);
    byKey.set(key, list);
  }
  const burstEnds: string[] = [];
  for (const list of byKey.values()) {
    const asc = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    for (const burst of splitLogsIntoTimeBursts(asc, LOG_AGGREGATION_WINDOW_MS)) {
      burstEnds.push(burst[burst.length - 1]!.created_at);
    }
  }
  return burstEnds.sort((a, b) => b.localeCompare(a)).slice(0, CONTROL_TOWER_ACTIVITY_PER_CARD);
}

const logs: LogModificaRow[] = [
  lavUpdate("1", "lav-a", "2026-06-03T10:00:00.000Z", "priorita", "media", "alta"),
  lavUpdate("2", "lav-a", "2026-06-03T10:00:12.000Z", "stato", "accettazione", "in_lavorazione"),
  lavUpdate("3", "lav-a", "2026-06-03T15:00:00.000Z", "stato", "in_lavorazione", "completata"),
  lavUpdate("4", "lav-b", "2026-06-03T14:00:00.000Z", "note", "a", "b"),
  lavUpdate("5", "lav-c", "2026-06-03T13:00:00.000Z", "note", "x", "y"),
];

const feed = buildControlTowerActivityFeedSlice({
  lavRows: [],
  ricambi: [],
  logLavorazioni: logs,
});

const feedAt = feed.byDomain.lavorazioni.map((item) => item.at);
const expectedAt = expectedBurstTimestamps(logs);

assert.deepEqual(
  feedAt,
  expectedAt,
  "dashboard feed timestamps must match SSOT burst ordering",
);

assert.equal(feed.byDomain.lavorazioni.length, 4, "three bursts on lav-a + one each on lav-b/c");
assert.equal(feed.byDomain.lavorazioni[0]?.at, "2026-06-03T15:00:00.000Z");
assert.equal(feed.byDomain.lavorazioni[0]?.eventCount, 1);

console.log("control-tower-activity-ssot-fidelity.test: OK");
