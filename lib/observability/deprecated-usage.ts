import { gestionaleLogger } from "@/lib/observability/logger";
import { incrementHealthCounter } from "@/lib/observability/runtime-health";

/**
 * Runtime evidence for deprecated/fallback paths (dead-code audit Phase 3).
 * ponytail: in-memory counter only; upgrade path = export to ops dashboard.
 */
export function trackDeprecatedUsage(
  path: string,
  meta?: Record<string, string | number | boolean>
): void {
  gestionaleLogger.info("deprecated.usage", {
    meta: { deprecatedPath: path, used: true, ...meta },
  });
  incrementHealthCounter(`deprecated:${path}`);
}
