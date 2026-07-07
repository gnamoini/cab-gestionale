import assert from "node:assert/strict";
import {
  isoToDateInputValue,
  lavorazioneCompletamentoFieldsFromYmd,
} from "@/lib/lavorazioni/date-day-only";
import { lavorazioneDataCompletamentoIso } from "@/lib/lavorazioni/lavorazioni-list-table-display";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

const NEW_YMD = "2026-07-15";

const fields = lavorazioneCompletamentoFieldsFromYmd(NEW_YMD);
assert.equal(fields.ok, true, "valid ymd");
if (!fields.ok) throw new Error("expected ok");

assert.equal(fields.fields.data_uscita, NEW_YMD, "data_uscita is ymd");
assert.equal(
  isoToDateInputValue(fields.fields.archived_at),
  NEW_YMD,
  "archived_at calendar day matches ymd",
);

const before: LavorazioneListRow = {
  id: "lav-arch",
  mezzo_id: "m1",
  stato: "completata",
  priorita: "media",
  data_ingresso: "2026-01-01",
  data_uscita: "2026-03-01",
  note: null,
  created_by: null,
  created_at: "2026-01-01T10:00:00.000Z",
  updated_at: "2026-03-01T12:00:00.000Z",
  archived: true,
  archived_at: "2026-03-01T08:00:00.000Z",
  deleted_at: null,
  mezzo: null,
};

assert.equal(
  lavorazioneDataCompletamentoIso(before),
  "2026-03-01T08:00:00.000Z",
  "display prefers archived_at before patch",
);

const after: LavorazioneListRow = {
  ...before,
  data_uscita: fields.fields.data_uscita,
  archived_at: fields.fields.archived_at,
};

assert.equal(
  lavorazioneDataCompletamentoIso(after),
  fields.fields.archived_at,
  "display shows new archived_at after sync patch",
);
assert.equal(
  isoToDateInputValue(lavorazioneDataCompletamentoIso(after)),
  NEW_YMD,
  "displayed completion day matches new ymd",
);

assert.equal(lavorazioneCompletamentoFieldsFromYmd("invalid").ok, false, "rejects invalid ymd");

console.log("lavorazioni-completamento-update.test.ts OK");
