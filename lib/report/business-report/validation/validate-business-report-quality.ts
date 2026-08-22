import type { BusinessReportRuntimeContext } from "@/lib/report/business-report/context/build-business-report-context";
import type { BusinessReportAiOutput } from "@/lib/report/business-report/schema/business-report-ai-output-schema";
import type { BusinessReportQuality } from "@/lib/report/business-report/types";
import { validateBusinessReportClaims } from "@/lib/report/business-report/validation/validate-business-report-claims";
import { validateBusinessReportOutput } from "@/lib/report/business-report/validation/validate-business-report-output";
import { validateBusinessReportTrust } from "@/lib/report/business-report/validation/validate-business-report-trust";

export type ValidateBusinessReportAiResult =
  | { ok: true; quality: BusinessReportQuality }
  | { ok: false; verdict: "needs_retry" | "failed"; reason: string; quality: BusinessReportQuality };

export function validateBusinessReportAiOutput(
  output: BusinessReportAiOutput,
  ctx: BusinessReportRuntimeContext,
): ValidateBusinessReportAiResult {
  const failures: string[] = [];

  const schema = validateBusinessReportOutput(output, ctx);
  if (!schema.ok) failures.push(schema.reason);

  const trust = validateBusinessReportTrust(output, ctx);
  if (!trust.ok) failures.push(trust.reason);

  const claims = validateBusinessReportClaims(output, ctx);
  if (!claims.ok) failures.push(claims.reason);

  const configuredCount =
    ctx.reportType === "monthly"
      ? 16
      : 12;
  const metricCoverage = ctx.analytics.metrics.length / Math.max(1, configuredCount);
  const dataCompleteness = ctx.analytics.metrics.filter((m) => m.trust !== "not_available").length / Math.max(1, ctx.analytics.metrics.length);
  const claimSupport = claims.ok ? 1 : 0;
  const trustCompliance = trust.ok ? 1 : 0;

  const quality: BusinessReportQuality = {
    verdict: failures.length === 0 ? "publishable" : failures.some((f) => f.includes("unsupported")) ? "failed" : "needs_retry",
    dataCompleteness,
    metricCoverage,
    claimSupport,
    trustCompliance,
    failures: failures.length ? failures : undefined,
  };

  if (failures.length === 0) return { ok: true, quality };
  return {
    ok: false,
    verdict: quality.verdict === "failed" ? "failed" : "needs_retry",
    reason: failures[0]!,
    quality,
  };
}
