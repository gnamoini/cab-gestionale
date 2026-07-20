import type { NarrativeQualityReport } from "@/lib/report/narrative/quality/narrative-quality.types";
import { emitNarrativeGenerationTelemetry } from "@/lib/report/narrative/observability/emit-narrative-observability";

const observations: NarrativeQualityReport[] = [];

export function emitNarrativeQualityTelemetry(
  report: NarrativeQualityReport,
  opts?: { correlationId?: string; tenantResolved?: boolean },
): void {
  observations.push({ ...report });
  if (opts?.correlationId) {
    emitNarrativeGenerationTelemetry({
      correlationId: opts.correlationId,
      outcome: report.failureCode ? "failed" : "completed",
      code: report.failureCode,
      tenantResolved: opts.tenantResolved,
      report,
    });
  }
}

/** Test-only: read telemetry buffer. */
export function drainNarrativeQualityTelemetry(): NarrativeQualityReport[] {
  const copy = [...observations];
  observations.length = 0;
  return copy;
}
