import assert from "node:assert/strict";
import {
  humanizeKpiFactorLabel,
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
assert.match(sla, /14 giorni dall'ingresso/, sla);
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
assert.match(riskLabel, /5 su 15 lavori aperti da oltre 14 giorni/, riskLabel);
assert.doesNotMatch(riskLabel, /lavorazioni in ritardo|fermi troppo/, riskLabel);

const stagnation: RiskModifierExplainNode = {
  id: "stagnation",
  label: "Stagnazione",
  penalty: 2,
  motivation: "3 lavorazioni ferme oltre la media degli stati di attesa",
  trace: [],
};
const stagnationLabel = humanizeRiskFactorLabel(stagnation);
assert.match(stagnationLabel, /in attesa \(ricambi, preventivo, coda\)/, stagnationLabel);
assert.doesNotMatch(stagnationLabel, /lavorazioni ferme/, stagnationLabel);

console.log("humanize-factor-label.test.ts OK");
