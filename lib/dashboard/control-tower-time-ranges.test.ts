import assert from "node:assert/strict";
import { inclusiveDayCount } from "@/lib/report/date-ranges";
import {
  getControlTowerBriefPreviousCompareRange,
  getControlTowerBriefPreviousRange,
  getControlTowerBriefDataFetchRange,
  getControlTowerCurrentDayRange,
  getControlTowerCurrentMonthRange,
  getControlTowerCurrentWeekRange,
  getControlTowerHealthScoreDataFetchRange,
  getControlTowerHealthScoreHistoryFetchRange,
  getControlTowerLast30DaysRange,
  getControlTowerPrevious30DaysRange,
  getControlTowerPreviousMonthRange,
  getControlTowerPreviousWeekRange,
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

const prevMon = getControlTowerPreviousWeekRange(MON);
assert.equal(ymd(prevMon.start), "2026-05-25", "prev week lun start");
assert.equal(ymd(prevMon.end), "2026-05-31", "prev week dom end");

const prevWed = getControlTowerPreviousWeekRange(WED);
assert.equal(ymd(prevWed.start), "2026-05-25");
assert.equal(ymd(prevWed.end), "2026-05-31", "full previous week even mid-week");

const curMonthWed = getControlTowerCurrentMonthRange(WED);
assert.equal(ymd(curMonthWed.start), "2026-06-01");
assert.equal(ymd(curMonthWed.end), "2026-06-03");

const prevMonthWed = getControlTowerPreviousMonthRange(WED);
assert.equal(ymd(prevMonthWed.start), "2026-05-01");
assert.equal(ymd(prevMonthWed.end), "2026-05-31", "full previous month");

const prevMonthCompareWed = getControlTowerBriefPreviousCompareRange("month", WED);
assert.equal(ymd(prevMonthCompareWed.start), "2026-04-01");
assert.equal(ymd(prevMonthCompareWed.end), "2026-04-30");

const prevWeekCompareWed = getControlTowerBriefPreviousCompareRange("week", WED);
assert.equal(ymd(prevWeekCompareWed.start), "2026-05-18");
assert.equal(ymd(prevWeekCompareWed.end), "2026-05-24");

const briefFetch = getControlTowerBriefDataFetchRange(WED);
assert.equal(ymd(briefFetch.start), "2026-04-01", "fetch range includes cascaded closed compare windows");

const SEP1 = new Date(2026, 8, 1, 10, 0, 0, 0); // mar 1 set — primo giorno mese
const curMonthSep1 = getControlTowerCurrentMonthRange(SEP1);
assert.equal(ymd(curMonthSep1.start), "2026-09-01");
assert.equal(ymd(curMonthSep1.end), "2026-09-01");
const prevMonthSep1 = getControlTowerPreviousMonthRange(SEP1);
assert.equal(ymd(prevMonthSep1.start), "2026-08-01");
assert.equal(ymd(prevMonthSep1.end), "2026-08-31", "1 set: mese prec = agosto intero");

const curWeekSep1 = getControlTowerCurrentWeekRange(SEP1);
assert.equal(ymd(curWeekSep1.start), "2026-08-31", "1 set: settimana corrente da lun");
assert.equal(ymd(curWeekSep1.end), "2026-09-01");
const prevWeekSep1 = getControlTowerPreviousWeekRange(SEP1);
assert.equal(ymd(prevWeekSep1.start), "2026-08-24");
assert.equal(ymd(prevWeekSep1.end), "2026-08-30", "1 set: settimana prec chiusa");

const AUG31 = new Date(2026, 7, 31, 18, 0, 0, 0); // lun 31 ago — ultimo giorno mese
const prevMonthAug31 = getControlTowerPreviousMonthRange(AUG31);
assert.equal(ymd(prevMonthAug31.start), "2026-07-01");
assert.equal(ymd(prevMonthAug31.end), "2026-07-31");

const briefPrevWeekSep1 = getControlTowerBriefPreviousRange("week", SEP1);
assert.equal(ymd(briefPrevWeekSep1.start), "2026-08-24");
assert.equal(ymd(briefPrevWeekSep1.end), "2026-08-30");

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
assert.equal(ymd(weeklyAnchors[25]!.weekEnd), "2026-06-07", "mid-week newest weekEnd stays on Sunday");
assert.equal(ymd(weeklyAnchors[25]!.anchor), "2026-06-03", "score anchor clamps to today mid-week");
assert.equal(ymd(weeklyAnchors[24]!.weekEnd), "2026-05-31", "prior week ends on Sunday");

const SUN = new Date(2026, 5, 7, 12, 0, 0, 0);
const weeklySunday = getControlTowerWeeklyHealthScoreAnchors(SUN, 2);
assert.equal(ymd(weeklySunday[1]!.weekEnd), "2026-06-07", "Sunday anchor uses full week end");

const historyFetch = getControlTowerHealthScoreHistoryFetchRange(WED, 26);
assert.ok(historyFetch.start.getTime() < weeklyAnchors[0]!.weekStart.getTime(), "history fetch precede oldest week");
assert.equal(ymd(historyFetch.end), ymd(weeklyAnchors[25]!.weekEnd));

console.log("control-tower-time-ranges.test: OK");
