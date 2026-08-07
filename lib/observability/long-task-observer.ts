"use client";

import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { recordHealthMetric } from "@/lib/observability/runtime-health";

type LongTaskObserverHandle = {
  disconnect: () => void;
};

/** ponytail: Chrome/Edge only — graceful no-op elsewhere. */
export function mountLongTaskObserver(getRoute: () => string): LongTaskObserverHandle | null {
  if (typeof PerformanceObserver === "undefined") return null;

  try {
    const observer = new PerformanceObserver((list) => {
      const route = getRoute();
      const timestamp = Date.now();
      for (const entry of list.getEntries()) {
        const duration = entry.duration;
        trackRuntimeEvent(RuntimeEvents.longTask, {
          durationMs: Math.round(duration),
          route,
          timestamp,
        });
        recordHealthMetric("longTaskMs", duration);
      }
    });
    observer.observe({ type: "longtask", buffered: true });
    return { disconnect: () => observer.disconnect() };
  } catch {
    return null;
  }
}
