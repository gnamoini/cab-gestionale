import type { InvalidateOperationalTruthOptions } from "@/src/lib/runtime/truth-layer/invalidate-operational-truth";

/** Contratto opzioni invalidazione report (coalesce / no broadcast loop). */
export function assertOperationalInvalidationReportCoalesce(
  opts: Pick<InvalidateOperationalTruthOptions, "domain" | "skipReportBroadcast">,
): void {
  if (opts.domain !== "report") {
    throw new Error(`assertOperationalInvalidation: expected domain "report", got "${opts.domain}"`);
  }
  if (!opts.skipReportBroadcast) {
    throw new Error("assertOperationalInvalidation: report refresh must set skipReportBroadcast=true");
  }
}
