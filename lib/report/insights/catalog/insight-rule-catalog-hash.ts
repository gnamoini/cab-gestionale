import { createHash } from "node:crypto";
import type { InsightRuleDefinition } from "@/lib/report/insights/insight-rule-types";

function stableHash(parts: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

export function computeInsightDefinitionHash(rule: InsightRuleDefinition): string {
  return stableHash([
    rule.severity,
    rule.priority,
    [...rule.metricIds].sort(),
    rule.applicability,
    rule.domain,
    rule.requiresTrust ? [...rule.requiresTrust].sort() : null,
  ]);
}

export function computeInsightNavigationHash(rule: InsightRuleDefinition): string {
  return stableHash([
    rule.drillDown.metricId,
    rule.drillDown.targetSection,
    rule.drillDown.targetTab ?? null,
  ]);
}

export type InsightCatalogSnapshotRule = {
  ruleKey: string;
  ruleVersion: number;
  domain: InsightRuleDefinition["domain"];
  severity: InsightRuleDefinition["severity"];
  priority: number;
  applicability: InsightRuleDefinition["applicability"];
  metricIds: string[];
  definitionHash: string;
  navigationHash: string;
};

export function buildInsightCatalogSnapshotRules(
  rules: readonly InsightRuleDefinition[],
): InsightCatalogSnapshotRule[] {
  return [...rules]
    .sort((a, b) => a.ruleKey.localeCompare(b.ruleKey))
    .map((rule) => ({
      ruleKey: rule.ruleKey,
      ruleVersion: rule.ruleVersion,
      domain: rule.domain,
      severity: rule.severity,
      priority: rule.priority,
      applicability: rule.applicability,
      metricIds: [...rule.metricIds].sort(),
      definitionHash: computeInsightDefinitionHash(rule),
      navigationHash: computeInsightNavigationHash(rule),
    }));
}
