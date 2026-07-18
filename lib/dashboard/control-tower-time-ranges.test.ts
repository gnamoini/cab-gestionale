import assert from "node:assert/strict";
import { inclusiveDayCount } from "@/lib/report/date-ranges";
import {
  getControlTowerCurrentDayRange,
  getControlTowerCurrentMonthRange,
  getControlTowerCurrentWeekRange,
  getControlTowerBriefDataFetchRange,
  getControlTowerHealthScoreDataFetchRange,
  getControlTowerHealthScoreHistoryFetchRange,
  getControlTowerLast30DaysRange,
  getControlTowerPrevious30DaysRange,
  getControlTowerPreviousMonthSameWindowRange,
  getControlTowerPreviousWeekSameWindowRange,
  getControlTowerWeekEndAnchor,
  getControlTowerWeeklyHealthScoreAnchors,
} from "@/lib/dashboard/control-tower-time-ranges";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WED = new Date(2026, 5, 3, 14, 30, 0, 0); // mer 3 giu 2026
const curDayWed = getControlTowerCurrentDayRange(WED);
assert.equal(ymd(curDayWed.start), "2026-06-03");
assert.equal(ymd(curDayWed.end), "2026-06-03");

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

const curMonthWed = getControlTowerCurrentMonthRange(WED);
assert.equal(ymd(curMonthWed.start), "2026-06-01");
assert.equal(ymd(curMonthWed.end), "2026-06-03");

const prevMonthWed = getControlTowerPreviousMonthSameWindowRange(WED);
assert.equal(ymd(prevMonthWed.start), "2026-05-01");
assert.equal(ymd(prevMonthWed.end), "2026-05-03");

const briefFetch = getControlTowerBriefDataFetchRange(WED);
assert.equal(ymd(briefFetch.start), "2026-05-01", "fetch range includes previous month window");

const last30 = getControlTowerLast30DaysRange(WED);
assert.equal(ymd(last30.start), "2026-05-05");
assert.equal(ymd(last30.end), "2026-06-03");
assert.equal(inclusiveDayCount(last30), 30);

const prev30 = getControlTowerPrevious30DaysRange(WED);
assert.equal(inclusiveDayCount(prev30), 30);
assert.ok(prev30.end.getTime() < last30.start.getTime(), "previous 30d ends before current window");

const healthFetch = getControlTowerHealthScoreDataFetchRange(WED);
assert.equal(ymd(healthFetch.start), ymd(prev30.start));
assert.equal(ymd(healthFetch.end), ymd(last30.end));
assert.equal(ymd(briefFetch.end), "2026-06-03");

const weekEndWed = getControlTowerWeekEndAnchor(WED);
assert.equal(ymd(weekEndWed), "2026-06-07", "mer in week ending dom");

const weeklyAnchors = getControlTowerWeeklyHealthScoreAnchors(WED, 26);
assert.equal(weeklyAnchors.length, 26);
assert.equal(ymd(weeklyAnchors[0]!.weekStart), "2025-12-08", "oldest week start ~26w back");
assert.equal(ymd(weeklyAnchors[25]!.weekEnd), "2026-06-07", "newest week end = current week end");

const historyFetch = getControlTowerHealthScoreHistoryFetchRange(WED, 26);
assert.ok(historyFetch.start.getTime() < weeklyAnchors[0]!.weekStart.getTime(), "history fetch precede oldest week");
assert.equal(ymd(historyFetch.end), ymd(weeklyAnchors[25]!.weekEnd));

console.log("control-tower-time-ranges.test: OK");
