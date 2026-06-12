/**
 * Dev-only React render counter via Profiler callback.
 * Enable: NODE_ENV=development + NEXT_PUBLIC_RENDER_AUDIT=1
 */

export type RenderAuditEntry = {
  componentName: string;
  renderCount: number;
  lastRenderAt: number;
  lastPhase: string;
  lastActualDurationMs: number;
};

const enabled =
  typeof process !== "undefined" &&
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_RENDER_AUDIT !== "0" &&
  (process.env.NEXT_PUBLIC_RENDER_AUDIT === "1" ||
    (typeof process.env.NEXT_PUBLIC_RENDER_AUDIT === "undefined" && false));

const counts = new Map<string, RenderAuditEntry>();

export function isReactRenderAuditEnabled(): boolean {
  return enabled;
}

export function recordProfilerRender(
  id: string,
  phase: "mount" | "update" | "nested-update",
  actualDuration: number,
): void {
  if (!enabled) return;
  const prev = counts.get(id);
  const entry: RenderAuditEntry = {
    componentName: id,
    renderCount: (prev?.renderCount ?? 0) + 1,
    lastRenderAt: Date.now(),
    lastPhase: phase,
    lastActualDurationMs: Math.round(actualDuration * 100) / 100,
  };
  counts.set(id, entry);
}

export function getRenderAuditEntries(): RenderAuditEntry[] {
  return [...counts.values()].sort((a, b) => b.renderCount - a.renderCount);
}

export function getExcessiveRenders(threshold = 3): RenderAuditEntry[] {
  return getRenderAuditEntries().filter((e) => e.renderCount > threshold);
}

export function resetRenderAudit(): void {
  counts.clear();
}

export function dumpRenderAudit(threshold = 3): {
  entries: RenderAuditEntry[];
  excessiveRenders: RenderAuditEntry[];
} {
  const entries = getRenderAuditEntries();
  return {
    entries,
    excessiveRenders: entries.filter((e) => e.renderCount > threshold),
  };
}

if (typeof window !== "undefined" && enabled) {
  (window as Window & { __cabRenderAudit?: typeof dumpRenderAudit }).__cabRenderAudit = dumpRenderAudit;
}
