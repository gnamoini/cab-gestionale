/**
 * GlobalDatePickerYmd: digitazione parziale non aggiorna YMD finché il parse non è valido.
 */
import assert from "node:assert/strict";
import {
  isoToDateInputValue,
  isoToItDisplay,
  parseItalianDayToIso,
} from "@/lib/lavorazioni/date-day-only";

function onChangeYmdStyle(next: string, state: { ymd: string; draft: string }) {
  state.draft = next;
  if (!next.trim()) {
    state.ymd = "";
    return;
  }
  const r = parseItalianDayToIso(next);
  if (r.ok) state.ymd = isoToDateInputValue(r.iso);
}

const state = { ymd: "2026-06-15", draft: "15/06/2026" };

onChangeYmdStyle("15/06/202", state);
assert.equal(state.draft, "15/06/202");
assert.equal(state.ymd, "2026-06-15");

onChangeYmdStyle("25/12/2026", state);
assert.equal(state.draft, "25/12/2026");
assert.equal(state.ymd, "2026-12-25");

const blur = (draft: string) => {
  const trimmed = draft.trim();
  if (!trimmed) return { ymd: "", display: "" };
  const r = parseItalianDayToIso(trimmed);
  if (r.ok) return { ymd: isoToDateInputValue(r.iso), display: isoToItDisplay(r.iso) };
  return { ymd: "", display: "" };
};

assert.deepEqual(blur("25/12/2026"), { ymd: "2026-12-25", display: "25/12/2026" });
assert.deepEqual(blur("bad"), { ymd: "", display: "" });

console.log("global-date-picker-ymd.test.ts: ok");
