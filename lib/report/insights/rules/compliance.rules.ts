import type { InsightRuleDefinition } from "@/lib/report/insights/insight-rule-types";
import { fire, skipFalse, skipMissing } from "@/lib/report/insights/rules/rule-helpers";

export const COMPLIANCE_INSIGHT_RULES: InsightRuleDefinition[] = [
  {
    ruleKey: "COMP_REVISION_EXPIRED",
    ruleVersion: 1,
    domain: "compliance",
    severity: "critical",
    priority: 25,
    applicability: "active",
    metricIds: ["flotta-officina"],
    drillDown: { metricId: "flotta-officina", targetSection: "clienti_mezzi" },
    evaluate(input) {
      const overdue = input.signals.cross.get("compliance_overdue")?.value ?? 0;
      if (overdue <= 0) return skipFalse(this);
      return fire({
        ruleKey: this.ruleKey,
        ruleVersion: this.ruleVersion,
        severity: this.severity,
        priority: this.priority,
        metricIds: [...this.metricIds],
        trust: "AMBER",
        payload: { overdueCount: overdue },
      });
    },
  },
  {
    ruleKey: "COMP_SERVICE_DUE",
    ruleVersion: 1,
    domain: "compliance",
    severity: "warning",
    priority: 20,
    applicability: "active",
    metricIds: ["flotta-officina"],
    drillDown: { metricId: "flotta-officina", targetSection: "clienti_mezzi" },
    evaluate(input) {
      const due = input.signals.cross.get("compliance_due_30d")?.value;
      if (due == null) return skipMissing(this);
      if (due <= 0) return skipFalse(this);
      return fire({
        ruleKey: this.ruleKey,
        ruleVersion: this.ruleVersion,
        severity: this.severity,
        priority: this.priority,
        metricIds: [...this.metricIds],
        trust: "GREEN",
        payload: { dueCount: due },
      });
    },
  },
];
