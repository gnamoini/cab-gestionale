import assert from "node:assert/strict";
import { resolveOperationalPeriod } from "@/lib/operational-intelligence/period/resolve-operational-period";

const weeklyRange = {
  start: new Date(2026, 6, 14),
  end: new Date(2026, 6, 20, 23, 59, 59, 999),
};
const weekly = resolveOperationalPeriod({ preset: "current_week", range: weeklyRange });
assert.equal(weekly.type, "weekly");
assert.equal(weekly.startDate, "2026-07-14");
assert.equal(weekly.previousPeriodId, "weekly:2026-07-07");

const monthlyRange = {
  start: new Date(2026, 6, 1),
  end: new Date(2026, 6, 31, 23, 59, 59, 999),
};
const monthly = resolveOperationalPeriod({ preset: "questo_mese", range: monthlyRange });
assert.equal(monthly.type, "monthly");
