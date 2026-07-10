import assert from "node:assert/strict";
import {
  operationalDiaryWeekDays,
  operationalDiaryWeekOffsetForYmd,
  ymdFromLocalDate,
} from "@/lib/operational-diary/operational-diary-week";

const anchor = new Date(2026, 5, 4, 12, 0, 0, 0);
const days = operationalDiaryWeekDays(anchor, 0);
assert.equal(days.length, 7);
assert.equal(days[0]?.ymd, "2026-06-01");
assert.equal(days[6]?.ymd, "2026-06-07");
assert.equal(ymdFromLocalDate(anchor), "2026-06-04");

assert.equal(operationalDiaryWeekOffsetForYmd(anchor, "2026-06-04"), 0);
assert.equal(operationalDiaryWeekOffsetForYmd(anchor, "2026-05-28"), -1);
assert.equal(operationalDiaryWeekOffsetForYmd(anchor, "2026-06-10"), 1);

console.log("operational-diary-week.test: OK");
