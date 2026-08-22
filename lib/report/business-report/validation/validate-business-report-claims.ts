import {
  numericEvidenceMatches,
  type NumericEvidenceIndex,
} from "@/lib/report/narrative/quality/extract-numeric-evidence";
import { extractNarrativeClaims } from "@/lib/report/narrative/quality/extract-narrative-claims";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import type { BusinessReportRuntimeContext } from "@/lib/report/business-report/context/build-business-report-context";
import type { BusinessReportAiOutput } from "@/lib/report/business-report/schema/business-report-ai-output-schema";
import type { BusinessReportClaim, BusinessReportClaimType } from "@/lib/report/business-report/types";
import { resolveEnvelopeCompareDeltaPercent } from "@/lib/report/business-report/metrics/resolve-envelope-compare-delta";

export type ValidateClaimsResult =
  | { ok: true; claims: BusinessReportClaim[] }
  | { ok: false; reason: string; claims: BusinessReportClaim[] };

const IMPROVE_WORDS = /\b(migliorat[oaie]|cresciut[oaie]|aumentat[oaie]|in\s+rialzo|positiv[oaie])\b/i;
const WORSE_WORDS = /\b(peggiorat[oaie]|calat[oaie]|diminuit[oaie]|in\s+calo|negativ[oaie])\b/i;
const COMPARE_WORDS = /\b(superiore|inferiore|rispetto\s+al\s+periodo\s+precedente|vs\s+periodo\s+precedente)\b/i;
const CAUSAL_WORDS = /\b(ha\s+causato|a\s+causa\s+di|determinato\s+da|provocato\s+da)\b/i;
const ENTITY_PATTERN = /\bcliente\s+[A-ZÀ-Ú][\w\s]{2,40}\b/i;

function classifyClaim(text: string): BusinessReportClaimType[] {
  const types: BusinessReportClaimType[] = [];
  if (extractNarrativeClaims(text).length > 0) types.push("numeric");
  if (IMPROVE_WORDS.test(text) || WORSE_WORDS.test(text)) types.push("directional");
  if (COMPARE_WORDS.test(text)) types.push("comparison");
  if (ENTITY_PATTERN.test(text)) types.push("entity");
  if (CAUSAL_WORDS.test(text)) types.push("causal");
  return types.length ? types : ["directional"];
}

function envelopeEvidence(env: ReportMetricEnvelope): NumericEvidenceIndex {
  const values: number[] = [];
  if (typeof env.metric.value === "number" && Number.isFinite(env.metric.value)) values.push(env.metric.value);
  const delta = resolveEnvelopeCompareDeltaPercent(env);
  if (delta != null) values.push(delta);
  return { values };
}

function metricDeltaDirection(ctx: BusinessReportRuntimeContext, metricId: string): "up" | "down" | "flat" | null {
  const env = ctx.envelopesById.get(metricId);
  const delta = env ? resolveEnvelopeCompareDeltaPercent(env) : null;
  if (delta == null || !Number.isFinite(delta)) return null;
  if (delta > 2) return "up";
  if (delta < -2) return "down";
  return "flat";
}

function validateDirectional(text: string, ctx: BusinessReportRuntimeContext, metricIds: string[]): boolean {
  const wantsUp = IMPROVE_WORDS.test(text);
  const wantsDown = WORSE_WORDS.test(text);
  if (!wantsUp && !wantsDown) return true;

  for (const metricId of metricIds) {
    const dir = metricDeltaDirection(ctx, metricId);
    if (dir == null) continue;
    if (wantsUp && dir === "down") return false;
    if (wantsDown && dir === "up") return false;
  }
  return true;
}

function collectTexts(output: BusinessReportAiOutput): Array<{ text: string; metricIds: string[]; ruleKey?: string }> {
  const rows: Array<{ text: string; metricIds: string[]; ruleKey?: string }> = [
    { text: output.executiveSummary, metricIds: [] },
  ];
  for (const x of output.highlightExplanations) {
    rows.push({ text: x.explanation, metricIds: x.metricIds, ruleKey: x.ruleKey });
  }
  for (const x of output.concernExplanations) {
    rows.push({ text: x.explanation, metricIds: x.metricIds, ruleKey: x.ruleKey });
  }
  for (const x of output.anomalyExplanations) {
    rows.push({ text: x.explanation, metricIds: x.metricIds, ruleKey: x.ruleKey });
  }
  for (const d of output.decisions) {
    rows.push({ text: d.rationale, metricIds: d.supportingMetricIds });
  }
  return rows;
}

export function validateBusinessReportClaims(
  output: BusinessReportAiOutput,
  ctx: BusinessReportRuntimeContext,
): ValidateClaimsResult {
  const claims: BusinessReportClaim[] = [];

  for (const row of collectTexts(output)) {
    const types = classifyClaim(row.text);
    const claim: BusinessReportClaim = {
      text: row.text,
      type: types[0] ?? "directional",
      metricIds: row.metricIds,
      insightRuleKeys: row.ruleKey ? [row.ruleKey] : undefined,
      confidence: types.includes("numeric") ? "verified" : "derived",
    };
    claims.push(claim);

    if (types.includes("numeric")) {
      for (const metricId of row.metricIds.length ? row.metricIds : ctx.analytics.metrics.map((m) => m.metricId)) {
        const env = ctx.envelopesById.get(metricId);
        if (!env) continue;
        const evidence = envelopeEvidence(env);
        for (const c of extractNarrativeClaims(row.text)) {
          if (!numericEvidenceMatches(evidence, c.normalized, c.kind)) {
            return { ok: false, reason: `numeric claim unsupported for ${metricId}`, claims };
          }
        }
      }
    }

    if (types.includes("directional")) {
      const ids = row.metricIds.length ? row.metricIds : ctx.analytics.metrics.map((m) => m.metricId);
      if (!validateDirectional(row.text, ctx, ids)) {
        return { ok: false, reason: "directional claim contradicts certified delta", claims };
      }
    }

    if (types.includes("causal")) {
      return { ok: false, reason: "unsupported causal claim", claims };
    }

    if (types.includes("entity")) {
      return { ok: false, reason: "unsupported entity claim", claims };
    }
  }

  return { ok: true, claims };
}
