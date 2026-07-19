import assert from "node:assert/strict";
import {
  humanizeKpiFactorLabel,
  humanizeKpiFactorMeta,
  humanizeRiskFactorLabel,
} from "@/lib/health-score/explain/humanize-factor-label";
import type { KpiExplainNode, RiskModifierExplainNode } from "@/lib/health-score/types";

function kpi(partial: Partial<KpiExplainNode> & Pick<KpiExplainNode, "id" | "current">): KpiExplainNode {
  return {
    label: partial.id,
    sectionId: "produzione",
    previous: null,
    target: null,
    trendPct: null,
    trendScore: 50,
    levelScore: 50,
    kpiScore: 55,
    kpiScorePrev: null,
    staticWeight: 1,
    dynamicWeight: 1,
    confidence: "high",
    confidenceMultiplier: 1,
    dataQuality: "high",
    dataQualityMultiplier: 1,
    dependencyFactor: 1,
    effectiveWeight: 1,
    contributionPoints: 1,
    motivation: "",
    trace: [],
    ...partial,
  };
}

const completate = humanizeKpiFactorLabel(
  kpi({ id: "completate", current: 44, previous: 38, label: "Completate nel periodo" }),
);
assert.match(completate, /Più lavori chiusi/, completate);
assert.doesNotMatch(completate, /campione/, completate);

const assenze = humanizeKpiFactorLabel(
  kpi({ id: "absence-procapite", current: 3.2, label: "Assenze pro-capite" }),
);
assert.match(assenze, /Assenze del team/, assenze);
assert.doesNotMatch(assenze, /pro-capite/, assenze);

const sla = humanizeKpiFactorLabel(
  kpi({ id: "sla-late-pct", current: 12, label: "SLA ritardo %" }),
);
assert.match(sla, /Quota lavori oltre 14 giorni/, sla);
assert.doesNotMatch(sla, /SLA|tempi di consegna/, sla);

const backlogAge = humanizeKpiFactorLabel(
  kpi({ id: "backlog-age", current: 24.2, previous: 24.2, label: "Età media backlog" }),
);
assert.match(backlogAge, /Anzianità media lavori aperti/, backlogAge);
assert.doesNotMatch(backlogAge, /in coda|fermi/, backlogAge);

const urgent = humanizeKpiFactorLabel(
  kpi({ id: "urgent-turnaround", current: 2.5, previous: 4, label: "Tempo lavori urgenti" }),
);
assert.match(urgent, /lavori urgenti/, urgent);
assert.doesNotMatch(urgent, /urgente in coda/, urgent);

const risk: RiskModifierExplainNode = {
  id: "late-ingress",
  label: "Ritardo ingresso",
  penalty: 3,
  motivation: "5 lavorazioni in ritardo su 15 aperte",
  trace: [],
};
const riskLabel = humanizeRiskFactorLabel(risk);
assert.match(riskLabel, /Ritardo oltre 14 giorni dall'ingresso/, riskLabel);
assert.doesNotMatch(riskLabel, /lavorazioni in ritardo|5 su 15/, riskLabel);

const stagnation: RiskModifierExplainNode = {
  id: "stagnation",
  label: "Stagnazione",
  penalty: 2,
  motivation: "3 lavorazioni ferme oltre la media degli stati di attesa",
  trace: [],
};
const stagnationLabel = humanizeRiskFactorLabel(stagnation);
assert.match(stagnationLabel, /Lavori in attesa oltre la media/, stagnationLabel);
assert.doesNotMatch(stagnationLabel, /lavorazioni ferme/, stagnationLabel);

const hoursMeta = humanizeKpiFactorMeta(
  kpi({
    id: "hours-worked",
    current: 708,
    previous: 480,
    trendPct: 47.5,
    kpiScore: 82.1,
    effectiveWeight: 0.15,
  }),
);
assert.equal(
  hoursMeta,
  "708 h (prima 480 h) · +47.5% · valutazione 82.1/100 · peso 15% sul totale",
  hoursMeta,
);

const stableMeta = humanizeKpiFactorMeta(
  kpi({ id: "backlog", current: 12, previous: 12, trendPct: 0, kpiScore: 65, effectiveWeight: 0.26 }),
);
assert.equal(
  stableMeta,
  "12, uguale al periodo precedente · valutazione 65/100 · peso 26% sul totale",
  stableMeta,
);

console.log("humanize-factor-label.test.ts OK");
