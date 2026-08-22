import { createHash } from "node:crypto";
import type { DecisionEntityRef } from "@/lib/report/decision-center/types";

export type FingerprintInput = {
  ruleKey: string;
  metricIds: readonly string[];
  periodKey: string;
  entity?: DecisionEntityRef;
};

function normalizeMetricIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort();
}

export function buildPeriodKey(from: string, to: string, compareMode: string): string {
  return `${from}:${to}:${compareMode}`;
}

/** Entity-aware stable fingerprint (C2). */
export function buildCandidateFingerprint(input: FingerprintInput): string {
  const parts = [
    input.ruleKey,
    normalizeMetricIds(input.metricIds).join(","),
    input.periodKey,
    input.entity?.dimension ?? "",
    input.entity?.entityId ?? "",
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

/** Snapshot of rule inputs for dismissed anti-loop (C6). */
export function buildConditionHash(input: {
  ruleKey: string;
  metricIds: readonly string[];
  insightRuleKeys: readonly string[];
  eventIds: readonly string[];
  entity?: DecisionEntityRef;
}): string {
  const parts = [
    input.ruleKey,
    normalizeMetricIds(input.metricIds).join(","),
    [...input.insightRuleKeys].sort().join(","),
    [...input.eventIds].sort().join(","),
    input.entity?.dimension ?? "",
    input.entity?.entityId ?? "",
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24);
}

export function buildCandidateId(fingerprint: string): string {
  return `dc_${fingerprint}`;
}
