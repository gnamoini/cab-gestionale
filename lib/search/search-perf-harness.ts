/**
 * Shared harness for search performance benchmarks (tests).
 */

import type { SearchHotPathCounters } from "@/lib/search/search-hot-path-probe";
import type { SearchRenderCounters } from "@/lib/search/search-render-probe";

export const SEARCH_PERF_TYPING_SEQUENCE = ["C", "CE", "CER", "CERE", "CEREB", "CEREBA"] as const;

export type SearchPerfBudgetSnapshot = {
  parentRenders: number;
  islandRenders: number;
  searchAppliedUpdates: number;
  hotPath: SearchHotPathCounters;
  filterCpuMs: number;
};

export function simulateTypingBurst(
  applyChar: (value: string) => void,
  sequence: readonly string[] = SEARCH_PERF_TYPING_SEQUENCE,
): void {
  for (const partial of sequence) {
    applyChar(partial);
  }
}

export function assertSearchPerfBudget(
  snapshot: SearchPerfBudgetSnapshot,
  opts: {
    maxParentRendersOnKeystrokeOnly: number;
    maxSearchAppliedPerBurst: number;
    minIslandRenders?: number;
  },
): void {
  if (snapshot.parentRenders > opts.maxParentRendersOnKeystrokeOnly) {
    throw new Error(
      `parent renders ${snapshot.parentRenders} > budget ${opts.maxParentRendersOnKeystrokeOnly}`,
    );
  }
  if (snapshot.searchAppliedUpdates > opts.maxSearchAppliedPerBurst) {
    throw new Error(
      `searchApplied updates ${snapshot.searchAppliedUpdates} > budget ${opts.maxSearchAppliedPerBurst}`,
    );
  }
  if (opts.minIslandRenders != null && snapshot.islandRenders < opts.minIslandRenders) {
    throw new Error(`island renders ${snapshot.islandRenders} < expected ${opts.minIslandRenders}`);
  }
}

export function mergeRenderCounters(
  renders: SearchRenderCounters,
  hotPath: SearchHotPathCounters,
  searchAppliedUpdates: number,
): SearchPerfBudgetSnapshot {
  return {
    parentRenders: renders.parentRenders,
    islandRenders: renders.islandRenders,
    searchAppliedUpdates,
    hotPath: { ...hotPath },
    filterCpuMs: hotPath.filterCpuMs,
  };
}
