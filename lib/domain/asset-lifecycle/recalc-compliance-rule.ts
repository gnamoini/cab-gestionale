import type {
  AssetComplianceRuleRow,
  ComplianceTriggerKind,
} from "@/src/types/supabase-tables";

/** Ricalcolo client-side next_due (preview); SSOT DB = recalc_compliance_rule_due trigger. */
export function computeNextDueFromRule(
  rule: Pick<
    AssetComplianceRuleRow,
    | "trigger_kind"
    | "interval_months"
    | "fixed_month"
    | "fixed_day"
    | "km_interval"
    | "next_due_at"
    | "next_due_km"
    | "last_completed_at"
    | "mezzo_id"
  >,
  currentKm?: number | null,
): { nextDueAt: string | null; nextDueKm: number | null } {
  const trigger = rule.trigger_kind as ComplianceTriggerKind;

  if (trigger === "one_shot") {
    return { nextDueAt: rule.next_due_at, nextDueKm: null };
  }

  if (trigger === "km_interval" && rule.km_interval != null && currentKm != null) {
    return { nextDueAt: null, nextDueKm: currentKm + rule.km_interval };
  }

  if (trigger === "date_interval" && rule.interval_months != null && rule.last_completed_at) {
    const base = new Date(rule.last_completed_at);
    base.setMonth(base.getMonth() + rule.interval_months);
    return { nextDueAt: base.toISOString().slice(0, 10), nextDueKm: null };
  }

  if (trigger === "fixed_date" && rule.fixed_month != null && rule.fixed_day != null) {
    const now = new Date();
    let year = now.getFullYear();
    let candidate = new Date(year, rule.fixed_month - 1, rule.fixed_day);
    if (candidate < now) {
      year += 1;
      candidate = new Date(year, rule.fixed_month - 1, rule.fixed_day);
    }
    return { nextDueAt: candidate.toISOString().slice(0, 10), nextDueKm: null };
  }

  return { nextDueAt: rule.next_due_at, nextDueKm: rule.next_due_km };
}
