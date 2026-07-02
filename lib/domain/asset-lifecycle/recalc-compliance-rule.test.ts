import assert from "node:assert/strict";
import { computeNextDueFromRule } from "@/lib/domain/asset-lifecycle/recalc-compliance-rule";

const { nextDueAt } = computeNextDueFromRule({
  trigger_kind: "date_interval",
  interval_months: 24,
  fixed_month: null,
  fixed_day: null,
  km_interval: null,
  next_due_at: null,
  next_due_km: null,
  last_completed_at: "2024-01-15T10:00:00Z",
  mezzo_id: "m1",
});
assert.ok(nextDueAt?.startsWith("2026-01"), `expected 2026-01, got ${nextDueAt}`);

const km = computeNextDueFromRule(
  {
    trigger_kind: "km_interval",
    interval_months: null,
    fixed_month: null,
    fixed_day: null,
    km_interval: 15000,
    next_due_at: null,
    next_due_km: null,
    last_completed_at: null,
    mezzo_id: "m1",
  },
  120000,
);
assert.equal(km.nextDueKm, 135000);

console.log("recalc-compliance-rule.test.ts OK");
