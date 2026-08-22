import { businessReportAiOutputSchema } from "@/lib/report/business-report/schema/business-report-ai-output-schema";
import type { BusinessReportRuntimeContext } from "@/lib/report/business-report/context/build-business-report-context";

export type ValidateOutputResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateBusinessReportOutput(
  output: unknown,
  ctx: BusinessReportRuntimeContext,
): ValidateOutputResult {
  const parsed = businessReportAiOutputSchema.safeParse(output);
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.message };
  }

  const allowedRuleKeys = new Set(ctx.insights.map((i) => i.ruleKey));
  const allowedMetricIds = new Set(ctx.analytics.metrics.map((m) => m.metricId));

  for (const section of [
    ...parsed.data.highlightExplanations,
    ...parsed.data.concernExplanations,
    ...parsed.data.anomalyExplanations,
  ]) {
    if (!allowedRuleKeys.has(section.ruleKey)) {
      return { ok: false, reason: `unsupported ruleKey: ${section.ruleKey}` };
    }
    for (const mid of section.metricIds) {
      if (!allowedMetricIds.has(mid)) {
        return { ok: false, reason: `unsupported metricId: ${mid}` };
      }
    }
  }

  for (const d of parsed.data.decisions) {
    for (const mid of d.supportingMetricIds) {
      if (!allowedMetricIds.has(mid)) {
        return { ok: false, reason: `unsupported decision metricId: ${mid}` };
      }
    }
  }

  return { ok: true };
}
