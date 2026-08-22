import "server-only";

import {
  DECISION_RULE_REGISTRY,
  type DecisionRuleContext,
} from "@/lib/report/decision-center/rules/decision-rule-registry";
import type { DecisionCenterRuntimeContext } from "@/lib/report/decision-center/context/build-decision-center-context.server";
import { buildDecisionEvidence } from "@/lib/report/decision-center/engine/build-decision-evidence";
import { computeDecisionPriority } from "@/lib/report/decision-center/engine/priority-engine";
import {
  buildCandidateFingerprint,
  buildCandidateId,
  buildConditionHash,
} from "@/lib/report/decision-center/fingerprint/decision-fingerprint";
import type { DecisionCandidate } from "@/lib/report/decision-center/types";
import type { ReportMetricEnvelopeTrust } from "@/lib/report/metrics/report-metric-envelope";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import type { BusinessReportDecisionPoint } from "@/lib/report/business-report/types";

function worstTrust(metricIds: string[], envelopes: Map<string, ReportMetricEnvelope>): ReportMetricEnvelopeTrust {
  const order: ReportMetricEnvelopeTrust[] = ["not_available", "partial", "estimated", "verified"];
  let worst: ReportMetricEnvelopeTrust = "verified";
  for (const id of metricIds) {
    const t = envelopes.get(id)?.trust ?? "not_available";
    if (order.indexOf(t) < order.indexOf(worst)) worst = t;
  }
  return worst;
}

export function buildDecisionCandidates(ctx: DecisionCenterRuntimeContext): DecisionCandidate[] {
  const ruleCtx: DecisionRuleContext = {
    envelopesById: ctx.envelopesById,
    insights: ctx.insights,
    summaryEvents: ctx.summaryEvents,
    periodKey: ctx.periodKey,
  };

  const out: DecisionCandidate[] = [];

  for (const rule of DECISION_RULE_REGISTRY) {
    const match = rule.evaluate(ruleCtx);
    if (!match) continue;

    const fingerprint = buildCandidateFingerprint({
      ruleKey: rule.ruleKey,
      metricIds: match.metricIds,
      periodKey: ctx.periodKey,
      entity: match.entity,
    });
    const conditionHash = buildConditionHash({
      ruleKey: rule.ruleKey,
      metricIds: match.metricIds,
      insightRuleKeys: match.insightRuleKeys,
      eventIds: match.eventIds,
      entity: match.entity,
    });

    const severityRank =
      match.insightRuleKeys.length > 0
        ? Math.max(
            ...ctx.insights
              .filter((i) => match.insightRuleKeys.includes(i.ruleKey))
              .map((i) => (i.severity === "critical" ? 3 : i.severity === "warning" ? 2 : 1)),
          )
        : 1;

    const { priority } = computeDecisionPriority(rule, {
      insightCount: match.insightRuleKeys.length,
      eventCount: match.eventIds.length,
      maxSeverity: severityRank,
    });

    const evidence = buildDecisionEvidence(match, ctx.envelopesById);

    out.push({
      candidateId: buildCandidateId(fingerprint),
      candidateFingerprint: fingerprint,
      conditionHash,
      ruleKey: rule.ruleKey,
      title: match.title,
      summary: match.summary,
      rationale: match.rationale,
      priority,
      category: rule.category,
      trust: worstTrust(match.metricIds, ctx.envelopesById),
      metricIds: match.metricIds,
      insightRuleKeys: match.insightRuleKeys,
      eventIds: match.eventIds,
      entity: match.entity,
      evidence,
      source: "rule_engine",
    });
  }

  return out.sort((a, b) => {
    const pr = { critical: 4, high: 3, medium: 2, low: 1 };
    return pr[b.priority] - pr[a.priority] || a.title.localeCompare(b.title);
  });
}

export function businessReportDecisionToCandidate(
  d: BusinessReportDecisionPoint,
  ctx: DecisionCenterRuntimeContext,
  sourceReportRunId: string,
): DecisionCandidate | null {
  if (!d.supportingMetricIds.length) return null;
  const fingerprint = buildCandidateFingerprint({
    ruleKey: "BUSINESS_REPORT",
    metricIds: d.supportingMetricIds,
    periodKey: ctx.periodKey,
  });
  const conditionHash = buildConditionHash({
    ruleKey: "BUSINESS_REPORT",
    metricIds: d.supportingMetricIds,
    insightRuleKeys: d.insightRuleKeys ?? [],
    eventIds: [],
  });
  const evidence = buildDecisionEvidence(
    {
      title: d.title,
      summary: d.rationale,
      rationale: d.rationale,
      metricIds: d.supportingMetricIds,
      insightRuleKeys: d.insightRuleKeys ?? [],
      eventIds: [],
    },
    ctx.envelopesById,
  );

  return {
    candidateId: buildCandidateId(fingerprint),
    candidateFingerprint: fingerprint,
    conditionHash,
    ruleKey: "BUSINESS_REPORT",
    title: d.title,
    summary: d.rationale,
    rationale: d.rationale,
    priority: "medium",
    category: "economic",
    trust: worstTrust(d.supportingMetricIds, ctx.envelopesById),
    metricIds: d.supportingMetricIds,
    insightRuleKeys: d.insightRuleKeys ?? [],
    eventIds: [],
    evidence,
    source: "business_report",
    sourceReportRunId,
  };
}
