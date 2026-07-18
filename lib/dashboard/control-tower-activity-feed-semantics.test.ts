import assert from "node:assert/strict";
import {
  buildControlTowerActivityFeedSlice,
  splitLogsIntoTimeBursts,
} from "@/lib/dashboard/control-tower-selectors";
import { LOG_AGGREGATION_WINDOW_MS } from "@/lib/gestionale-log/log-event-pipeline";
import type { LogModificaRow } from "@/src/types/supabase-tables";

function lavLog(
  id: string,
  lavId: string,
  created_at: string,
  field: string,
  before: string,
  after: string,
): LogModificaRow {
  return {
    id,
    entita: "lavorazioni",
    entita_id: lavId,
    azione: "UPDATE",
    created_at,
    payload: { before: { [field]: before }, after: { [field]: after } },
    autore_id: null,
  };
}

{
  const asc = [
    lavLog("a", "lav-1", "2026-06-03T10:00:00.000Z", "priorita", "media", "alta"),
    lavLog("b", "lav-1", "2026-06-03T10:00:15.000Z", "stato", "accettazione", "in_lavorazione"),
  ];
  const bursts = splitLogsIntoTimeBursts(asc, LOG_AGGREGATION_WINDOW_MS);
  assert.equal(bursts.length, 1, "updates within 5min share one burst");
}

{
  const asc = [
    lavLog("a", "lav-1", "2026-06-03T10:00:00.000Z", "priorita", "media", "alta"),
    lavLog("b", "lav-1", "2026-06-03T15:00:00.000Z", "stato", "in_lavorazione", "completata"),
  ];
  const bursts = splitLogsIntoTimeBursts(asc, LOG_AGGREGATION_WINDOW_MS);
  assert.equal(bursts.length, 2, "updates 5h apart are separate bursts");
}

{
  const closeBurst = [
    lavLog("1", "lav-1", "2026-06-03T10:00:00.000Z", "priorita", "media", "alta"),
    lavLog("2", "lav-1", "2026-06-03T10:00:10.000Z", "stato", "accettazione", "in_lavorazione"),
    lavLog("3", "lav-1", "2026-06-03T15:00:00.000Z", "stato", "in_lavorazione", "completata"),
  ];
  const feed = buildControlTowerActivityFeedSlice({
    lavRows: [],
    ricambi: [],
    logLavorazioni: closeBurst,
  });
  assert.equal(feed.byDomain.lavorazioni.length, 2, "close burst merged, distant update separate");
  assert.equal(feed.byDomain.lavorazioni[0]?.at, "2026-06-03T15:00:00.000Z");
  assert.equal(feed.byDomain.lavorazioni[1]?.at, "2026-06-03T10:00:10.000Z");
}

{
  const magLogs: LogModificaRow[] = [
    {
      id: "m1",
      entita: "movimenti_ricambi",
      entita_id: "mov-1",
      azione: "CREATE",
      created_at: "2026-06-03T11:00:00.000Z",
      payload: { snapshot: { tipo: "uscita", ricambio_id: "ric-1", quantita: 2 } },
      autore_id: null,
    },
  ];
  const feed = buildControlTowerActivityFeedSlice({
    lavRows: [],
    ricambi: [],
    logMagazzino: magLogs,
  });
  assert.equal(feed.byDomain.magazzino.length, 1);
}

{
  const prevLogs: LogModificaRow[] = [
    {
      id: "p1",
      entita: "preventivi",
      entita_id: "prev-1",
      azione: "CREATE",
      created_at: "2026-06-03T12:00:00.000Z",
      payload: { snapshot: { cliente: "ACME" } },
      autore_id: null,
    },
  ];
  const feed = buildControlTowerActivityFeedSlice({
    lavRows: [],
    ricambi: [],
    logPreventivi: prevLogs,
  });
  assert.equal(feed.byDomain.preventiviDdt.length, 1);
}

console.log("control-tower-activity-feed-semantics.test: OK");
