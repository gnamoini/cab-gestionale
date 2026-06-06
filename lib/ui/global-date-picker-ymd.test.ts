/**
 * GlobalDatePickerYmd: digitazione parziale non aggiorna YMD finché il parse non è valido.
 */
import assert from "node:assert/strict";
import {
  isoToDateInputValue,
  isoToItDisplay,
} from "@/lib/lavorazioni/date-day-only";
import {
  parseItalianDayDisplayToIso,
} from "@/lib/ui/italian-date-input-mask";

function onChangeYmdStyle(next: string, state: { ymd: string; draft: string }) {
  state.draft = next;
  if (!next.trim()) {
    state.ymd = "";
    return;
  }
  const r = parseItalianDayDisplayToIso(next);
  if (r.ok) state.ymd = isoToDateInputValue(r.iso);
}

const state = { ymd: "2026-06-15", draft: "15/06/2026" };

onChangeYmdStyle("15/06/202", state);
assert.equal(state.draft, "15/06/202");
assert.equal(state.ymd, "2026-06-15");

onChangeYmdStyle("25/12/2026", state);
assert.equal(state.draft, "25/12/2026");
assert.equal(state.ymd, "2026-12-25");

onChangeYmdStyle("06/07/26", state);
assert.equal(state.draft, "06/07/26");
assert.equal(state.ymd, "2026-07-06");

const blur = (draft: string, prevYmd: string) => {
  const trimmed = draft.trim();
  if (!trimmed) return { ymd: "", display: "" };
  const r = parseItalianDayDisplayToIso(trimmed);
  if (r.ok) return { ymd: isoToDateInputValue(r.iso), display: isoToItDisplay(r.iso) };
  return { ymd: prevYmd, display: trimmed };
};

assert.deepEqual(blur("25/12/2026", ""), { ymd: "2026-12-25", display: "25/12/2026" });
assert.deepEqual(blur("06/07/26", ""), { ymd: "2026-07-06", display: "06/07/2026" });
assert.deepEqual(blur("bad", "2026-06-15"), { ymd: "2026-06-15", display: "bad" });
assert.deepEqual(blur("31/15/2026", "2026-06-15"), { ymd: "2026-06-15", display: "31/15/2026" });
assert.deepEqual(blur("31/06/26", "2026-06-15"), { ymd: "2026-06-15", display: "31/06/26" });

console.log("global-date-picker-ymd.test.ts: ok");
