import assert from "node:assert/strict";
import { OPERATIONAL_HEALTH_PERIOD_LABEL } from "@/lib/dashboard/control-tower-constants";
import {
  computeOperationalHealthScore,
  hasOperationalHealthData,
  splitHealthFactors,
} from "@/lib/dashboard/operational-health-score";
import type {
  ControlTowerAlertsSlice,
  ControlTowerHeaderKpiSlice,
} from "@/lib/dashboard/control-tower-selectors";

const emptyAlerts: ControlTowerAlertsSlice = { items: [] };

function header(clusters: ControlTowerHeaderKpiSlice["clusters"]): ControlTowerHeaderKpiSlice {
  return {
    windowLabel: "test",
    range: { start: new Date(), end: new Date() },
    clusters,
  };
}

const positiveTrend = computeOperationalHealthScore({
  headerKpi: header([
    {
      id: "lavorazioni",
      label: "Lavorazioni",
      metrics: [
        {
          id: "lav-completate",
          label: "Chiuse",
          value: 5,
          prevValue: 4,
          deltaPct: 25,
          deltaAbs: "+1",
          invert: false,
        },
      ],
    },
  ]),
  alerts: emptyAlerts,
});

assert.equal(positiveTrend.score, 59, "+25% trend yields ~59, not inflated 100");
assert.equal(positiveTrend.label, "Attenzione");
assert.equal(positiveTrend.metricCount, 1);

const withCritical = computeOperationalHealthScore({
  headerKpi: header([]),
  alerts: {
    items: [
      { id: "a1", severity: "critical", title: "3 ricambi sotto scorta" },
      { id: "a2", severity: "warning", title: "2 lavorazioni ferme" },
    ],
  },
});

assert.equal(withCritical.score, 38, "neutral base 50 minus one critical and one warning");
assert.ok(withCritical.factors.some((f) => f.impact < 0));

const negativeTrend = computeOperationalHealthScore({
  headerKpi: header([
    {
      id: "lavorazioni",
      label: "Lavorazioni",
      metrics: [
        {
          id: "lav-completate",
          label: "Lavorazioni chiuse",
          value: 1,
          prevValue: 10,
          deltaPct: -90,
          deltaAbs: "-9",
          invert: false,
        },
        {
          id: "dip-ore",
          label: "Ore di lavoro",
          value: 20,
          prevValue: 40,
          deltaPct: -50,
          deltaAbs: "-20",
          unit: "hours",
          invert: false,
        },
      ],
    },
  ]),
  alerts: emptyAlerts,
});

assert.ok(negativeTrend.score < 40, "strong negative trend lowers score materially");
assert.ok(negativeTrend.factors.some((f) => f.label.includes("Lavorazioni chiuse")));
assert.ok(negativeTrend.factors.some((f) => f.label.includes("Ore di lavoro")));
assert.equal(negativeTrend.periodLabel, OPERATIONAL_HEALTH_PERIOD_LABEL);

const clampedLow = computeOperationalHealthScore({
  headerKpi: header([
    {
      id: "ricambi",
      label: "Ricambi",
      metrics: [
        {
          id: "mag-sotto-scorta",
          label: "Sotto scorta",
          value: 20,
          prevValue: null,
          deltaPct: null,
          deltaAbs: null,
          snapshot: true,
          invert: true,
          hint: "test",
        },
      ],
    },
  ]),
  alerts: {
    items: [
      { id: "c1", severity: "critical", title: "A" },
      { id: "c2", severity: "critical", title: "B" },
      { id: "c3", severity: "critical", title: "C" },
      { id: "c4", severity: "critical", title: "D" },
      { id: "w1", severity: "warning", title: "W1" },
      { id: "w2", severity: "warning", title: "W2" },
      { id: "w3", severity: "warning", title: "W3" },
      { id: "w4", severity: "warning", title: "W4" },
      { id: "w5", severity: "warning", title: "W5" },
      { id: "w6", severity: "warning", title: "W6" },
    ],
  },
});

assert.equal(clampedLow.score, 0, "severe snapshots + max alert penalty floor at 0");
assert.equal(clampedLow.label, "Critico");
assert.equal(clampedLow.tone, "critical");

const split = splitHealthFactors([
  { label: "A", impact: 3 },
  { label: "B", impact: -5 },
  { label: "C", impact: 1 },
]);
assert.deepEqual(split.positive.map((f) => f.label), ["A", "C"]);
assert.deepEqual(split.negative.map((f) => f.label), ["B"]);

assert.equal(hasOperationalHealthData(header([])), false);
assert.equal(hasOperationalHealthData(header([{ id: "lavorazioni", label: "Lavorazioni", metrics: [] }])), true);

const shortUnderStock = computeOperationalHealthScore({
  headerKpi: header([
    {
      id: "ricambi",
      label: "Ricambi",
      metrics: [
        {
          id: "mag-sotto-scorta",
          label: "Sotto scorta",
          value: 1,
          prevValue: null,
          deltaPct: null,
          deltaAbs: null,
          snapshot: true,
          invert: true,
          hint: "test",
        },
      ],
    },
  ]),
  alerts: emptyAlerts,
  criticality: { sottoScorta: { count: 1, maxDays: 0.2, weightedSeverity: 0 } },
});

const longUnderStock = computeOperationalHealthScore({
  headerKpi: header([
    {
      id: "ricambi",
      label: "Ricambi",
      metrics: [
        {
          id: "mag-sotto-scorta",
          label: "Sotto scorta",
          value: 1,
          prevValue: null,
          deltaPct: null,
          deltaAbs: null,
          snapshot: true,
          invert: true,
          hint: "test",
        },
      ],
    },
  ]),
  alerts: emptyAlerts,
  criticality: { sottoScorta: { count: 1, maxDays: 24, weightedSeverity: 3 } },
});

assert.ok(shortUnderStock.score > longUnderStock.score, "brief under-stock should hurt less than weeks");

console.log("operational-health-score.test: OK");
