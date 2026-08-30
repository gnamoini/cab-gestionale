/**
 * @advisory v4 — offline telemetry aggregation. No runtime engine coupling.
 */
import type { SelectorOpenEvent } from "@/lib/selector-core/selector-telemetry";
import type {
  OptionCountBucket,
  SelectorDomainUsageStats,
  SelectorMismatchPattern,
  SelectorSurfaceKind,
} from "@/lib/selector-core/types";

const SURFACE_KINDS: readonly SelectorSurfaceKind[] = ["dropdown", "sheet", "searchableDropdown"];

function emptySurfaceCounts(): Record<SelectorSurfaceKind, number> {
  return { dropdown: 0, sheet: 0, searchableDropdown: 0 };
}

function emptyBucketCounts(): Record<OptionCountBucket, number> {
  return { "2-5": 0, "6-20": 0, "20-100": 0, "100+": 0 };
}

export function groupByDomain(events: readonly SelectorOpenEvent[]): Map<string, SelectorOpenEvent[]> {
  const map = new Map<string, SelectorOpenEvent[]>();
  for (const event of events) {
    const domain = event.domain?.trim() || "unknown";
    const list = map.get(domain) ?? [];
    list.push(event);
    map.set(domain, list);
  }
  return map;
}

export function computeUsageRatios(events: readonly SelectorOpenEvent[]): {
  searchUsageRate: number;
  sheetUsageRate: number;
  dropdownRate: number;
  fallbackRate: number;
  mobileRate: number;
} {
  const total = events.length;
  if (total === 0) {
    return {
      searchUsageRate: 0,
      sheetUsageRate: 0,
      dropdownRate: 0,
      fallbackRate: 0,
      mobileRate: 0,
    };
  }

  let searchCount = 0;
  let sheetCount = 0;
  let dropdownCount = 0;
  let fallbackCount = 0;
  let mobileCount = 0;

  for (const event of events) {
    if (event.searchUsed) searchCount += 1;
    if (event.surface === "sheet") sheetCount += 1;
    if (event.surface === "dropdown") dropdownCount += 1;
    if (event.fallbackUsed) fallbackCount += 1;
    if (event.isMobile) mobileCount += 1;
  }

  return {
    searchUsageRate: searchCount / total,
    sheetUsageRate: sheetCount / total,
    dropdownRate: dropdownCount / total,
    fallbackRate: fallbackCount / total,
    mobileRate: mobileCount / total,
  };
}

export function computeSurfaceEfficiency(events: readonly SelectorOpenEvent[]): {
  avgDecisionLatencyMs: number;
  avgLatencyBySurface: Record<SelectorSurfaceKind, number>;
} {
  const avgLatencyBySurface: Record<SelectorSurfaceKind, number> = {
    dropdown: 0,
    sheet: 0,
    searchableDropdown: 0,
  };
  const surfaceTotals = emptySurfaceCounts();
  let totalLatency = 0;

  for (const event of events) {
    totalLatency += event.decisionLatencyMs;
    surfaceTotals[event.surface] += 1;
    avgLatencyBySurface[event.surface] += event.decisionLatencyMs;
  }

  for (const surface of SURFACE_KINDS) {
    if (surfaceTotals[surface] > 0) {
      avgLatencyBySurface[surface] /= surfaceTotals[surface];
    }
  }

  return {
    avgDecisionLatencyMs: events.length > 0 ? totalLatency / events.length : 0,
    avgLatencyBySurface,
  };
}

export function resolvePreferredSurface(
  surfaceCounts: Record<SelectorSurfaceKind, number>,
): SelectorSurfaceKind {
  let preferred: SelectorSurfaceKind = "dropdown";
  let max = -1;
  for (const surface of SURFACE_KINDS) {
    if (surfaceCounts[surface] > max) {
      max = surfaceCounts[surface];
      preferred = surface;
    }
  }
  return preferred;
}

export type SelectorDomainUsageStatsWithPreferred = SelectorDomainUsageStats & {
  preferredSurface: SelectorSurfaceKind;
};

function buildDomainStats(domainEvents: readonly SelectorOpenEvent[]): SelectorDomainUsageStatsWithPreferred {
  const surfaceCounts = emptySurfaceCounts();
  const bucketCounts = emptyBucketCounts();

  for (const event of domainEvents) {
    surfaceCounts[event.surface] += 1;
    bucketCounts[event.optionCountBucket] += 1;
  }

  const ratios = computeUsageRatios(domainEvents);
  const efficiency = computeSurfaceEfficiency(domainEvents);
  const preferredSurface = resolvePreferredSurface(surfaceCounts);

  return {
    totalOpens: domainEvents.length,
    surfaceCounts,
    bucketCounts,
    searchUsageRate: ratios.searchUsageRate,
    sheetUsageRate: ratios.sheetUsageRate,
    dropdownRate: ratios.dropdownRate,
    fallbackRate: ratios.fallbackRate,
    avgDecisionLatencyMs: efficiency.avgDecisionLatencyMs,
    mobileRate: ratios.mobileRate,
    dropdownAbandonRate: null,
    preferredSurface,
  };
}

export function detectMismatchPatterns(
  domain: string,
  stats: SelectorDomainUsageStatsWithPreferred,
): SelectorMismatchPattern[] {
  const patterns: SelectorMismatchPattern[] = [];

  if (stats.searchUsageRate > 0.7 && stats.preferredSurface === "dropdown") {
    patterns.push({
      domain,
      pattern: "highSearchWithDropdown",
      severity: stats.searchUsageRate > 0.85 ? "high" : "medium",
    });
  }

  if (stats.fallbackRate > 0.05) {
    patterns.push({
      domain,
      pattern: "highFallback",
      severity: stats.fallbackRate > 0.1 ? "high" : "medium",
    });
  }

  if (stats.sheetUsageRate > 0.2 && stats.avgDecisionLatencyMs > 15) {
    patterns.push({
      domain,
      pattern: "highLatencySheet",
      severity: stats.avgDecisionLatencyMs > 25 ? "high" : "low",
    });
  }

  return patterns;
}

export function aggregateSelectorTelemetry(
  events: readonly SelectorOpenEvent[],
): Map<string, SelectorDomainUsageStatsWithPreferred> {
  const grouped = groupByDomain(events);
  const result = new Map<string, SelectorDomainUsageStatsWithPreferred>();

  for (const [domain, domainEvents] of grouped) {
    result.set(domain, buildDomainStats(domainEvents));
  }

  return result;
}

export function toDomainUsageStats(stats: SelectorDomainUsageStatsWithPreferred): SelectorDomainUsageStats {
  const { ...usageStats } = stats;
  return usageStats;
}
