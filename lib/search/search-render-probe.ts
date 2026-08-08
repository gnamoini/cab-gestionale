/**
 * Render counters for search island profiling (tests + gated dev).
 */

let forceEnabled = false;

export type SearchRenderCounters = {
  parentRenders: number;
  islandRenders: number;
};

const counters: SearchRenderCounters = {
  parentRenders: 0,
  islandRenders: 0,
};

export function forceSearchRenderProbe(enabled: boolean): void {
  forceEnabled = enabled;
}

export function isSearchRenderProbeActive(): boolean {
  return forceEnabled || process.env.NODE_ENV !== "production";
}

export function resetSearchRenderCounters(): SearchRenderCounters {
  counters.parentRenders = 0;
  counters.islandRenders = 0;
  return { ...counters };
}

export function getSearchRenderCounters(): Readonly<SearchRenderCounters> {
  return { ...counters };
}

export function probeParentRender(): void {
  if (!isSearchRenderProbeActive()) return;
  counters.parentRenders += 1;
}

export function probeIslandRender(): void {
  if (!isSearchRenderProbeActive()) return;
  counters.islandRenders += 1;
}
