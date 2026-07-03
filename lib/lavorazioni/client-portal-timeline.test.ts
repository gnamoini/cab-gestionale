import assert from "node:assert/strict";
import { buildClientTimelineEvents, buildClientPortalStatoTimelineFromRow } from "@/lib/lavorazioni/client-portal-timeline";
import type { LogModificaRow } from "@/src/types/supabase-tables";

const statiOpts = [
  { id: "accettazione", label: "Accettazione", color: "#52525b" },
  { id: "in_lavorazione", label: "In lavorazione", color: "#0284c7" },
  { id: "attesa_ricambi", label: "Attesa ricambi", color: "#7c3aed" },
];

function log(partial: Partial<LogModificaRow> & Pick<LogModificaRow, "id" | "azione" | "created_at">): LogModificaRow {
  return {
    entita: "lavorazioni",
    entita_id: "lav-1",
    autore_id: "user-1",
    payload: null,
    ...partial,
  } as LogModificaRow;
}

const sameTime = "2026-05-29T13:04:00.000Z";

const fromAccettazioneToLavorazione = buildClientTimelineEvents(
  [
    log({
      id: "u1",
      azione: "UPDATE",
      created_at: sameTime,
      payload: {
        before: { stato: "accettazione" },
        after: { stato: "in_lavorazione" },
      },
    }),
  ],
  statiOpts,
  { anchorAt: sameTime },
);

assert.equal(fromAccettazioneToLavorazione.length, 2, "UPDATE must emit both stati");
assert.equal(fromAccettazioneToLavorazione[0]?.title, "Stato · Accettazione");
assert.equal(fromAccettazioneToLavorazione[1]?.title, "Stato · In lavorazione");
assert.equal(fromAccettazioneToLavorazione[0]?.at, sameTime);
assert.equal(fromAccettazioneToLavorazione[1]?.at, sameTime);

const onlyInLavorazione = buildClientTimelineEvents(
  [
    log({
      id: "u2",
      azione: "UPDATE",
      created_at: sameTime,
      payload: {
        before: { stato: "accettazione" },
        after: { stato: "in_lavorazione" },
      },
    }),
    log({
      id: "u3",
      azione: "UPDATE",
      created_at: "2026-05-29T14:51:00.000Z",
      payload: {
        before: { stato: "in_lavorazione" },
        after: { stato: "attesa_ricambi" },
      },
    }),
  ],
  statiOpts,
  { anchorAt: "2026-05-29T12:00:00.000Z" },
);

assert.equal(onlyInLavorazione.length, 3);
assert.deepEqual(
  onlyInLavorazione.map((e) => e.title),
  ["Stato · Accettazione", "Stato · In lavorazione", "Stato · Attesa ricambi"],
);

const createWithAccettazione = buildClientTimelineEvents(
  [
    log({
      id: "c1",
      azione: "CREATE",
      created_at: "2026-05-26T08:00:00.000Z",
      payload: { snapshot: { stato: "accettazione" } },
    }),
    log({
      id: "u4",
      azione: "UPDATE",
      created_at: sameTime,
      payload: {
        before: { stato: "accettazione" },
        after: { stato: "in_lavorazione" },
      },
    }),
  ],
  statiOpts,
  { anchorAt: "2026-05-26T08:00:00.000Z" },
);

assert.equal(createWithAccettazione.length, 2);
assert.equal(createWithAccettazione[0]?.title, "Stato · Accettazione");
assert.equal(createWithAccettazione[0]?.at, "2026-05-26T08:00:00.000Z");

const statiWithDaLavorare = [
  ...statiOpts,
  { id: "da_lavorare", label: "Da lavorare", color: "#eab308" },
];

const currentStatoWithoutLog = buildClientTimelineEvents(
  [],
  statiWithDaLavorare,
  {
    anchorAt: "2026-07-01T08:00:00.000Z",
    currentStatoId: "da_lavorare",
    currentAt: "2026-07-03T09:02:00.000Z",
  },
);

assert.equal(currentStatoWithoutLog.length, 2, "must show accettazione + stato corrente");
assert.equal(currentStatoWithoutLog[1]?.title, "Stato · Da lavorare");
assert.equal(currentStatoWithoutLog[1]?.at, "2026-07-03T09:02:00.000Z");

const legacyIdResolved = buildClientTimelineEvents(
  [
    log({
      id: "u5",
      azione: "UPDATE",
      created_at: "2026-07-02T10:00:00.000Z",
      payload: {
        before: { stato: "accettazione" },
        after: { stato: "lav-stato-da-lavorare" },
      },
    }),
  ],
  [{ id: "accettazione", label: "Accettazione" }, { id: "in_coda", label: "Da lavorare" }],
  {
    anchorAt: "2026-07-01T08:00:00.000Z",
    currentStatoId: "in_coda",
    currentAt: "2026-07-03T09:02:00.000Z",
  },
);

assert.ok(
  legacyIdResolved.some((e) => e.title === "Stato · Da lavorare"),
  "legacy stato id must resolve to configured label",
);
assert.equal(
  legacyIdResolved.find((e) => e.title === "Stato · Da lavorare")?.at,
  "2026-07-02T10:00:00.000Z",
  "must use log timestamp when transition exists",
);

const fromRow = buildClientPortalStatoTimelineFromRow(
  [{ id: "accettazione", label: "Accettazione" }, { id: "attesa_ricambi", label: "Attesa ricambi" }],
  {
    anchorAt: "2026-07-01T08:00:00.000Z",
    currentStatoId: "attesa_ricambi",
    currentAt: "2026-07-03T09:02:00.000Z",
  },
);
assert.equal(fromRow.length, 2);
assert.equal(fromRow[0]?.at, "2026-07-01T08:00:00.000Z");
assert.equal(fromRow[1]?.at, "2026-07-03T09:02:00.000Z");

console.log("client-portal-timeline.test.ts OK");
