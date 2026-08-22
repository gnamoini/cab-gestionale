import { getEngineManifestEntry, EXECUTIVE_ENGINE_METRIC_IDS } from "@/lib/report/analytics-engine/engine-metric-manifest";
import { listApprovedMetricIdsForSection } from "@/lib/report/bi-center/section-data-map";

const EXECUTIVE_OVERLAP = new Set<string>(EXECUTIVE_ENGINE_METRIC_IDS);

function withoutExecutiveOverlap(ids: readonly string[]): readonly string[] {
  return ids.filter((id) => !EXECUTIVE_OVERLAP.has(id));
}

function engineBacked(ids: readonly string[]): readonly string[] {
  return ids.filter((id) => Boolean(getEngineManifestEntry(id)));
}

export type BiSectionId =
  | "executiveEnrichment"
  | "economia"
  | "lavorazioni"
  | "preventivi"
  | "magazzino"
  | "clienti"
  | "risorse"
  | "cross"
  | "primaryTrend";

const SECTION_METRICS: Record<BiSectionId, readonly string[]> = {
  executiveEnrichment: [...EXECUTIVE_ENGINE_METRIC_IDS],
  economia: withoutExecutiveOverlap(
    engineBacked(listApprovedMetricIdsForSection("economia")),
  ),
  lavorazioni: withoutExecutiveOverlap(
    engineBacked(listApprovedMetricIdsForSection("lavorazioni")),
  ),
  preventivi: engineBacked(listApprovedMetricIdsForSection("preventivi")),
  magazzino: withoutExecutiveOverlap(engineBacked(listApprovedMetricIdsForSection("magazzino"))),
  clienti: engineBacked(listApprovedMetricIdsForSection("clienti")),
  risorse: engineBacked(listApprovedMetricIdsForSection("risorse")),
  cross: engineBacked(listApprovedMetricIdsForSection("cross")),
  primaryTrend: [],
};

export function resolveSectionMetricIds(sectionId: BiSectionId): readonly string[] {
  return SECTION_METRICS[sectionId].filter((id) => Boolean(getEngineManifestEntry(id)));
}

export function unionSectionMetricIds(sections: readonly BiSectionId[]): string[] {
  const set = new Set<string>();
  for (const section of sections) {
    for (const id of resolveSectionMetricIds(section)) set.add(id);
  }
  return [...set].sort();
}

/** Executive metric ids shown in overview — exclude from PerformanceGate partition. */
export const EXECUTIVE_OVERVIEW_METRIC_IDS = new Set<string>(EXECUTIVE_ENGINE_METRIC_IDS);
