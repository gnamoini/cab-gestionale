/**
 * Lazy facade — critical shell imports this file only (not cold-start-diagnostics.ts).
 */
import { isNavigationBootDiagnosticsEnabled } from "@/lib/observability/navigation-boot-gate";

export function lazyMarkColdStart(markName: string): void {
  if (!isNavigationBootDiagnosticsEnabled()) return;
  try {
    performance.mark(markName);
  } catch {
    // ponytail: duplicate mark on remount — ignore
  }
}
