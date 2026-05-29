import { isObsPerfEnabled } from "@/lib/observability/config";
import { gestionaleLogger } from "@/lib/observability/logger";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import type { ObsOperation } from "@/lib/observability/types";

const DEFAULT_SLOW_MS = 500;

export async function measureAsync<T>(
  label: string,
  operation: ObsOperation,
  fn: () => Promise<T>,
  opts?: { slowMs?: number },
): Promise<T> {
  const slowMs = opts?.slowMs ?? DEFAULT_SLOW_MS;
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const durationMs = Math.round(performance.now() - start);
    const slow = durationMs >= slowMs;
    if (slow && isObsPerfEnabled()) {
      trackRuntimeEvent(RuntimeEvents.perfSlow, { label, durationMs, operation });
    } else {
      gestionaleLogger.debug("perf.timing", {
        operation,
        durationMs,
        meta: { label },
      });
    }
  }
}
