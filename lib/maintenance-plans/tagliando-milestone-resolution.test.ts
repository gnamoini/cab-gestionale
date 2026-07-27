import assert from "node:assert/strict";
import {
  anchoredMilestoneCellState,
  buildAnchoredHubMilestones,
  buildHubMilestoneColumnOres,
  estimateHubMilestoneDueDate,
  remainingMeterToNextFromConfig,
  resolveMilestoneInterval,
  resolveMilestoneIntervalOre,
  resolveNextUndoneMilestoneOre,
  serviceMeterAtExecution,
} from "@/lib/maintenance-plans/tagliando-milestone-resolution";

assert.deepEqual(
  buildHubMilestoneColumnOres({ intervalOre: 500, currentOre: 600, doneMilestoneOres: [] }),
  [500, 1000, 1500, 2000],
);

assert.deepEqual(
  buildHubMilestoneColumnOres({ intervalOre: 500, currentOre: 1200, doneMilestoneOres: [500, 1500] }),
  [500, 1000, 1500, 2000],
);

assert.equal(
  resolveNextUndoneMilestoneOre({ intervalOre: 500, doneMilestoneOres: [] }),
  500,
);

assert.equal(
  resolveNextUndoneMilestoneOre({ intervalOre: 500, doneMilestoneOres: [500, 1500] }),
  1000,
);

assert.equal(
  resolveNextUndoneMilestoneOre({ intervalOre: 500, doneMilestoneOres: [500, 1000, 1500] }),
  2000,
);

assert.equal(
  resolveMilestoneIntervalOre({
    intervalType: "mesi",
    intervalValue: 12,
    planIntervalOre: 500,
    planTriggers: [
      { triggerType: "ore", threshold: 500 },
      { triggerType: "mesi", threshold: 12 },
    ],
  }),
  500,
);

assert.deepEqual(
  resolveMilestoneInterval({
    intervalType: "km",
    intervalValue: 25000,
    planTriggers: [
      { triggerType: "km", threshold: 25000 },
      { triggerType: "mesi", threshold: 12 },
    ],
  }),
  { unit: "km", interval: 25000 },
);

assert.equal(
  resolveMilestoneInterval({
    intervalType: "km",
    intervalValue: 25000,
    planTriggers: [{ triggerType: "mesi", threshold: 12 }],
  })?.unit,
  "km",
);

assert.equal(serviceMeterAtExecution({ oreAtService: 73000, kmAtService: 73000 }, "km"), 73000);
assert.equal(serviceMeterAtExecution({ oreAtService: 0, kmAtService: 73000 }, "km"), 73000);
assert.equal(serviceMeterAtExecution({ oreAtService: 1270, kmAtService: null }, "ore"), 1270);

assert.equal(anchoredMilestoneCellState({ milestoneValue: 98000, currentValue: 80000, done: false }), "pending");
assert.equal(anchoredMilestoneCellState({ milestoneValue: 98000, currentValue: 99000, done: false }), "overdue");

const anchoredKm = buildAnchoredHubMilestones({
  interval: 25000,
  currentValue: 80000,
  executions: [{ value: 73000, performedAt: "2026-03-12", lavorazioneId: "lav-1" }],
  minFuture: 2,
});
assert.deepEqual(
  anchoredKm.map((r) => ({ value: r.value, done: r.done, state: r.state })),
  [
    { value: 73000, done: true, state: "done" },
    { value: 98000, done: false, state: "pending" },
    { value: 123000, done: false, state: "pending" },
  ],
);

const anchoredOre = buildAnchoredHubMilestones({
  interval: 500,
  currentValue: 1300,
  executions: [{ value: 1270, performedAt: "2026-01-15" }],
  minFuture: 2,
});
assert.equal(anchoredOre[0]?.value, 1270);
assert.equal(anchoredOre[1]?.value, 1770);

assert.equal(
  estimateHubMilestoneDueDate({
    done: true,
    performedAt: "2026-07-21",
    milestoneValue: 75636,
    currentValue: 80000,
    interval: 25000,
    unit: "km",
    executions: [],
  }),
  "2026-07-21",
);

assert.equal(
  estimateHubMilestoneDueDate({
    done: false,
    milestoneValue: 100636,
    currentValue: 75636,
    interval: 25000,
    unit: "km",
    executions: [{ value: 75636, performedAt: "2026-07-21" }],
    nextDateEstimated: "2027-07-21",
    remainingMeterToNext: 25000,
    today: "2026-07-21",
  }),
  "2027-07-21",
);

assert.equal(
  estimateHubMilestoneDueDate({
    done: false,
    milestoneValue: 125636,
    currentValue: 75636,
    interval: 25000,
    unit: "km",
    executions: [{ value: 75636, performedAt: "2026-07-21" }],
    nextDateEstimated: "2027-07-21",
    remainingMeterToNext: 25000,
    today: "2026-07-21",
  }),
  "2028-07-20",
);

assert.equal(
  remainingMeterToNextFromConfig(
    {
      intervalType: "mesi",
      remainingValue: 200,
      explainability: {
        groups: [{ alternatives: [{ type: "km", remaining: 25000 }] }],
      },
    },
    "km",
  ),
  25000,
);

console.log("tagliando-milestone-resolution.test.ts OK");
