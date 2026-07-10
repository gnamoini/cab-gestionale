import assert from "node:assert/strict";
import {
  enumerateBucketDates,
  rangeDayCount,
  resolveBucket,
  suggestBucketForRange,
} from "@/lib/report/kpi-series/bucket";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";

const short = {
  start: startOfLocalDay(new Date(2026, 0, 1)),
  end: endOfLocalDay(new Date(2026, 0, 7)),
};
assert.equal(suggestBucketForRange(short), "day");
const shortDays = rangeDayCount(short);
assert.equal(shortDays, 7);

const medium = {
  start: startOfLocalDay(new Date(2025, 0, 1)),
  end: endOfLocalDay(new Date(2025, 11, 31)),
};
assert.equal(suggestBucketForRange(medium), "week");

const days = enumerateBucketDates(short, "day");
assert.equal(days.length, shortDays);
assert.equal(days[0], "2026-01-01");

const resolved = resolveBucket(short, "day");
assert.equal(resolved.bucket, "day");
assert.equal(resolved.downgraded, false);

console.log("bucket.test.ts OK");
