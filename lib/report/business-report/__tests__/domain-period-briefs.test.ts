import assert from "node:assert/strict";
import {
  buildDomainPeriodBriefs,
  resolveInsightDomain,
  resolveMetricDomain,
} from "@/lib/report/business-report/analysis/build-domain-period-briefs";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";

function env(
  metricId: string,
  value: number,
  deltaPercent: number | null,
): ReportMetricEnvelope {
  return {
    metricId,
    formulaId: "test",
    trust: "verified",
    metric: {
      value,
      compare:
        deltaPercent == null
          ? undefined
          : {
              status: "available",
              deltaPercent,
              previousValue: value / (1 + deltaPercent / 100),
            },
    },
  } as ReportMetricEnvelope;
}

assert.equal(resolveMetricDomain("lav-tempo"), "lavorazioni");
assert.equal(resolveMetricDomain("flotta-officina"), "mezzi");
assert.equal(resolveInsightDomain("ORE_OVERTIME", []), "operai");
assert.equal(resolveInsightDomain("COMP_REVISION_EXPIRED", []), "mezzi");

const briefs = buildDomainPeriodBriefs({
  metrics: [
    env("lav-chiusi", 20, 10),
    env("lav-tempo", 5, 8),
    env("eco_incassato", 10000, -5),
    env("flotta-officina", 3, null),
  ],
  highlights: [],
  concerns: [
    {
      id: "1",
      ruleKey: "LAV_SLA_BREACH",
      title: "Oltre termine",
      explanation: "3 lavorazioni in ritardo",
      severity: "negative",
      metricIds: ["lav_late_sla"],
      insightRuleKeys: ["LAV_SLA_BREACH"],
    },
  ],
  anomalies: [],
});

const lavorazioni = briefs.find((b) => b.domainId === "lavorazioni");
assert.ok(lavorazioni);
assert.ok(lavorazioni.improved.some((m) => m.metricId === "lav-chiusi"));
assert.ok(lavorazioni.worsened.some((m) => m.metricId === "lav-tempo"));

const economia = briefs.find((b) => b.domainId === "economia");
assert.ok(economia?.worsened.some((m) => m.metricId === "eco_incassato"));

const mezzi = briefs.find((b) => b.domainId === "mezzi");
assert.ok(mezzi?.snapshots.some((m) => m.metricId === "flotta-officina"));

console.log("domain-period-briefs.test.ts OK");
