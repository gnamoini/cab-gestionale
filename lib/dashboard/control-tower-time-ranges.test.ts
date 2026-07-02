import assert from "node:assert/strict";
import {
  getControlTowerCurrentWeekRange,
  getControlTowerPreviousWeekSameWindowRange,
} from "@/lib/dashboard/control-tower-time-ranges";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WED = new Date(2026, 5, 3, 14, 30, 0, 0); // mer 3 giu 2026
const curWed = getControlTowerCurrentWeekRange(WED);
assert.equal(ymd(curWed.start), "2026-06-01", "mer start = lun");
assert.equal(ymd(curWed.end), "2026-06-03", "mer end = oggi");

const MON = new Date(2026, 5, 1, 9, 0, 0, 0); // lun 1 giu
const curMon = getControlTowerCurrentWeekRange(MON);
assert.equal(ymd(curMon.start), "2026-06-01");
assert.equal(ymd(curMon.end), "2026-06-01", "lun mattina = 1 giorno");

const prevMon = getControlTowerPreviousWeekSameWindowRange(MON);
assert.equal(ymd(prevMon.start), "2026-05-25", "prev lun start");
assert.equal(ymd(prevMon.end), "2026-05-25", "prev lun end same weekday");

const prevWed = getControlTowerPreviousWeekSameWindowRange(WED);
assert.equal(ymd(prevWed.start), "2026-05-25");
assert.equal(ymd(prevWed.end), "2026-05-27");

console.log("control-tower-time-ranges.test: OK");
