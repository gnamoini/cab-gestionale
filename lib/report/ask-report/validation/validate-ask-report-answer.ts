import type { AskReportToolResult } from "@/lib/report/ask-report/types";
import { extractNarrativeClaims } from "@/lib/report/narrative/quality/extract-narrative-claims";
import { findDerivedClaimTerm } from "@/lib/report/narrative/quality/derived-claim-denylist";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import { resolveEnvelopeCompareDeltaPercent } from "@/lib/report/business-report/metrics/resolve-envelope-compare-delta";

export type AskReportValidationVerdict = "publishable" | "needs_clarification" | "needs_retry" | "rejected";

export type AskReportValidationResult = {
  verdict: AskReportValidationVerdict;
  failures: string[];
};

function buildNumericEvidence(toolResults: AskReportToolResult[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of toolResults) {
    if (r.toolName === "get_metric" && r.success && r.data && !Array.isArray(r.data)) {
      const env = r.data as ReportMetricEnvelope;
      map.set(env.metricId, env.metric.value);
      const delta = resolveEnvelopeCompareDeltaPercent(env);
      if (delta != null) map.set(`${env.metricId}:delta`, delta);
    }
  }
  return map;
}

/** Validates answer against tool provenance + P4 narrative stack */
export function validateAskReportAnswer(
  answer: string,
  toolResults: AskReportToolResult[],
): AskReportValidationResult {
  const failures: string[] = [];

  if (/select\s+.+\s+from\s+/i.test(answer) || /\bfrom\s+invoices\b/i.test(answer)) {
    failures.push("sql_hallucination");
  }

  if (findDerivedClaimTerm(answer)) {
    failures.push("derived_claim");
  }

  if (/ha causato|a causa di/i.test(answer)) {
    failures.push("causal_claim");
  }

  const evidence = buildNumericEvidence(toolResults);
  const claims = extractNarrativeClaims(answer);

  for (const claim of claims) {
    if (claim.kind === "percent") {
      const hasDelta = [...evidence.values()].some((v) => Math.abs(v - claim.normalized) < 0.15);
      if (!hasDelta && evidence.size > 0) {
        failures.push(`unverified_percent:${claim.raw}`);
      }
    }
  }

  for (const r of toolResults) {
    if (r.toolName === "get_metric" && r.success && r.data && !Array.isArray(r.data)) {
      const env = r.data as ReportMetricEnvelope;
      if (env.trust === "estimated" && /margine\s+reale/i.test(answer)) {
        failures.push("trust_mismatch");
      }
    }
  }

  if (failures.includes("sql_hallucination") || failures.includes("trust_mismatch")) {
    return { verdict: "rejected", failures };
  }
  if (failures.length) return { verdict: "needs_retry", failures };
  return { verdict: "publishable", failures: [] };
}
