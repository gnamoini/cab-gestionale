import assert from "node:assert/strict";
import { consolidateLogModificaRows, isNetNoOpUpdateRow } from "@/lib/gestionale-log/log-consolidate";
import { classifyLogEvent } from "@/lib/gestionale-log/log-event-classify";
import { reconcileLogModificaRows } from "@/lib/gestionale-log/log-event-pipeline";
import type { LogModificaRow } from "@/src/types/supabase-tables";

function row(partial: Partial<LogModificaRow> & Pick<LogModificaRow, "id" | "created_at">): LogModificaRow {
  return {
    entita: "lavorazioni",
    entita_id: "lav-1",
    azione: "UPDATE",
    autore_id: "user-1",
    payload: {},
    ...partial,
  };
}

function updatePayload(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, unknown> {
  return { before, after };
}

{
  const rows = [
    row({
      id: "1",
      created_at: "2026-05-27T10:00:00.000Z",
      payload: updatePayload({ priorita: "media" }, { priorita: "alta" }),
    }),
    row({
      id: "2",
      created_at: "2026-05-27T10:00:05.000Z",
      payload: updatePayload({ priorita: "alta" }, { priorita: "bassa" }),
    }),
    row({
      id: "3",
      created_at: "2026-05-27T10:00:10.000Z",
      payload: updatePayload({ priorita: "bassa" }, { priorita: "urgente" }),
    }),
  ];
  const out = consolidateLogModificaRows(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.id, "3");
  const payload = out[0]!.payload as { before: { priorita: string }; after: { priorita: string } };
  assert.equal(payload.before.priorita, "media");
  assert.equal(payload.after.priorita, "urgente");
}

{
  const rows = [
    row({
      id: "1",
      created_at: "2026-05-27T10:00:00.000Z",
      payload: updatePayload({ priorita: "media" }, { priorita: "alta" }),
    }),
    row({
      id: "2",
      created_at: "2026-05-27T10:00:08.000Z",
      payload: updatePayload({ priorita: "alta" }, { priorita: "media" }),
    }),
  ];
  assert.equal(consolidateLogModificaRows(rows).length, 0);
  assert.equal(
    isNetNoOpUpdateRow(row({ id: "x", created_at: "t", payload: updatePayload({ priorita: "a" }, { priorita: "a" }) })),
    true,
  );
}

{
  const rows = [
    row({
      id: "c1",
      azione: "CREATE",
      created_at: "2026-05-27T10:00:00.000Z",
      payload: { snapshot: { nome: "Test" } },
    }),
    row({
      id: "d1",
      azione: "DELETE",
      created_at: "2026-05-27T10:00:12.000Z",
      payload: { snapshot: { nome: "Test" } },
    }),
  ];
  assert.equal(reconcileLogModificaRows(rows).length, 0);
}

{
  const rows = [
    row({
      id: "orig",
      created_at: "2026-05-27T10:00:00.000Z",
      payload: updatePayload({ note: "a" }, { note: "b" }),
    }),
    row({
      id: "rev",
      azione: "reverted",
      created_at: "2026-05-27T10:00:20.000Z",
      payload: { reverted_log_id: "orig" },
    }),
  ];
  const out = reconcileLogModificaRows(rows);
  assert.equal(out.some((r) => r.id === "orig"), false);
  assert.equal(out.some((r) => r.id === "rev"), true);
}

{
  const rows = [
    row({
      id: "m1",
      entita: "movimenti_ricambi",
      entita_id: "mov-1",
      azione: "CREATE",
      created_at: "2026-05-27T10:00:00.000Z",
      payload: { snapshot: { ricambio_id: "r1", tipo: "uscita", quantita: 1 } },
    }),
    row({
      id: "m2",
      entita: "movimenti_ricambi",
      entita_id: "mov-2",
      azione: "CREATE",
      created_at: "2026-05-27T10:00:05.000Z",
      payload: { snapshot: { ricambio_id: "r1", tipo: "uscita", quantita: 2 } },
    }),
  ];
  const out = reconcileLogModificaRows(rows);
  assert.equal(out.length, 1);
  const snap = (out[0]!.payload as { snapshot: { quantita: number } }).snapshot;
  assert.equal(snap.quantita, 3);
}

assert.equal(
  classifyLogEvent(
    row({
      id: "s",
      created_at: "t",
      payload: updatePayload({ stato: "a" }, { stato: "b" }),
    }),
  ),
  "STATUS_CHANGE",
);

assert.equal(
  classifyLogEvent(
    row({
      id: "q",
      created_at: "t",
      payload: updatePayload({ scorta: 1 }, { scorta: 2 }),
    }),
  ),
  "STOCK_MOVEMENT",
);

console.log("log-event-pipeline.test.ts: ok");
