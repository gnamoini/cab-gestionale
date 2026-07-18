import type { KpiExplainNode, SectionExplainNode } from "@/lib/health-score/types";

/** ponytail: fallback per breakdown legacy senza sectionScorePrev — media ponderata kpiScorePrev. */
export function aggregateSectionPrevScoreFromKpis(kpis: KpiExplainNode[]): number | null {
  let sum = 0;
  let weight = 0;
  for (const kpi of kpis) {
    if (kpi.redacted || kpi.effectiveWeight <= 0) continue;
    if (kpi.kpiScorePrev == null) continue;
    sum += kpi.kpiScorePrev * kpi.effectiveWeight;
    weight += kpi.effectiveWeight;
  }
  if (weight <= 0) return null;
  return Math.round((sum / weight) * 10) / 10;
}

export function resolveSectionPrevScore(section: SectionExplainNode): number | null {
  if (section.sectionScorePrev != null && Number.isFinite(section.sectionScorePrev)) {
    return section.sectionScorePrev;
  }
  return aggregateSectionPrevScoreFromKpis(section.kpis);
}
