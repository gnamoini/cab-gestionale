import assert from "node:assert/strict";
import { resolveSectionPrevScore } from "@/lib/health-score/explain/section-prev-score";
import type { SectionExplainNode } from "@/lib/health-score/types";

const section: SectionExplainNode = {
  id: "produzione",
  label: "Produzione",
  weight: 0.3,
  sectionScore: 54,
  sectionScorePrev: 53.2,
  contributionPoints: 1.2,
  kpis: [],
};

assert.equal(resolveSectionPrevScore(section), 53.2);

const legacy: SectionExplainNode = {
  ...section,
  sectionScorePrev: null,
  kpis: [
    {
      id: "completate",
      label: "Completate",
      sectionId: "produzione",
      current: 44,
      previous: 24,
      target: 20,
      trendPct: 83.3,
      trendScore: 70,
      levelScore: 55,
      kpiScore: 62,
      kpiScorePrev: 48,
      staticWeight: 0.3,
      dynamicWeight: 1,
      confidence: "high",
      confidenceMultiplier: 1,
      dataQuality: "high",
      dataQualityMultiplier: 1,
      dependencyFactor: 1,
      effectiveWeight: 0.39,
      contributionPoints: 0.5,
      motivation: "test",
      trace: [],
    },
  ],
};

assert.equal(resolveSectionPrevScore(legacy), 48);

console.log("section-prev-score.test.ts OK");
