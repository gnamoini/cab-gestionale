import { findDerivedClaimTerm } from "@/lib/report/narrative/quality/derived-claim-denylist";
import { exceedsTrustAssertivenessCap } from "@/lib/report/narrative/quality/detect-language-levels";
import type { TrustStatus } from "@/lib/report/contracts/metadata-envelope";
import type { BusinessReportRuntimeContext } from "@/lib/report/business-report/context/build-business-report-context";
import type { BusinessReportAiOutput } from "@/lib/report/business-report/schema/business-report-ai-output-schema";
import type { ReportMetricEnvelopeTrust } from "@/lib/report/metrics/report-metric-envelope";

export type ValidateTrustResult = { ok: true } | { ok: false; reason: string };

const REAL_MARGIN_PATTERN = /\bmargine\s+reale\b/i;
const CAUSAL_PATTERN = /\b(ha\s+causato|a\s+causa\s+di|determinato\s+da|provocato\s+da)\b/i;

function envelopeTrustToSignal(trust: ReportMetricEnvelopeTrust): TrustStatus {
  if (trust === "verified") return "GREEN";
  if (trust === "not_available") return "RED";
  return "AMBER";
}

export function validateBusinessReportTrust(
  output: BusinessReportAiOutput,
  ctx: BusinessReportRuntimeContext,
): ValidateTrustResult {
  const texts = [
    output.executiveSummary,
    ...output.highlightExplanations.map((x) => x.explanation),
    ...output.concernExplanations.map((x) => x.explanation),
    ...output.anomalyExplanations.map((x) => x.explanation),
    ...output.decisions.map((x) => x.rationale),
  ];

  for (const text of texts) {
    if (REAL_MARGIN_PATTERN.test(text)) {
      const margine = ctx.envelopesById.get("eco_margine_operativo_stimato");
      if (margine && margine.trust !== "verified") {
        return { ok: false, reason: "trust_language_drift: margine reale on estimated metric" };
      }
    }

    if (CAUSAL_PATTERN.test(text)) {
      return { ok: false, reason: "forbidden causal language in trust validation" };
    }

    const derived = findDerivedClaimTerm(text, "GENERIC");
    if (derived) {
      return { ok: false, reason: `forbidden derived claim term: ${derived}` };
    }

    for (const env of ctx.analytics.metrics) {
      if (!text.toLowerCase().includes(env.metricId.replace(/_/g, " ")) && !text.includes(String(env.metric.value))) {
        continue;
      }
      if (exceedsTrustAssertivenessCap(text, envelopeTrustToSignal(env.trust))) {
        return { ok: false, reason: `trust_language_drift for ${env.metricId}` };
      }
    }
  }

  return { ok: true };
}
