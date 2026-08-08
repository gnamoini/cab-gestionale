/**
 * Gated counters for search hot-path profiling (dev / NEXT_PUBLIC_OBS_PERF=1).
 * No-op in production unless explicitly enabled.
 */

import { isObsPerfEnabled } from "@/lib/observability/config";

export type SearchHotPathCounters = {
  searchInvocations: number;
  parseQueryCalls: number;
  documentBuildCalls: number;
  scoreCalls: number;
  filterPasses: number;
  filterCpuMs: number;
};

const counters: SearchHotPathCounters = {
  searchInvocations: 0,
  parseQueryCalls: 0,
  documentBuildCalls: 0,
  scoreCalls: 0,
  filterPasses: 0,
  filterCpuMs: 0,
};

let forceEnabled = false;

export function forceSearchHotPathProbe(enabled: boolean): void {
  forceEnabled = enabled;
}

export function isSearchHotPathProbeActive(): boolean {
  return forceEnabled || isObsPerfEnabled();
}

export function resetSearchHotPathCounters(): SearchHotPathCounters {
  counters.searchInvocations = 0;
  counters.parseQueryCalls = 0;
  counters.documentBuildCalls = 0;
  counters.scoreCalls = 0;
  counters.filterPasses = 0;
  counters.filterCpuMs = 0;
  return { ...counters };
}

export function getSearchHotPathCounters(): Readonly<SearchHotPathCounters> {
  return { ...counters };
}

export function probeSearchInvocation(): void {
  if (!isSearchHotPathProbeActive()) return;
  counters.searchInvocations += 1;
}

export function probeParseQuery(): void {
  if (!isSearchHotPathProbeActive()) return;
  counters.parseQueryCalls += 1;
}

export function probeDocumentBuild(): void {
  if (!isSearchHotPathProbeActive()) return;
  counters.documentBuildCalls += 1;
}

export function probeScore(): void {
  if (!isSearchHotPathProbeActive()) return;
  counters.scoreCalls += 1;
}

export function probeFilterPass(durationMs?: number): void {
  if (!isSearchHotPathProbeActive()) return;
  counters.filterPasses += 1;
  if (durationMs != null) counters.filterCpuMs += durationMs;
}

export function runProbedFilterPass<T>(fn: () => T): T {
  if (!isSearchHotPathProbeActive()) return fn();
  const start = performance.now();
  const result = fn();
  probeFilterPass(Math.round(performance.now() - start));
  return result;
}
