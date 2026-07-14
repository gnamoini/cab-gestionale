import { registerDefaultHealthKpis } from "@/lib/health-score/kpi/register-all";
import { registerDefaultRiskModifiers } from "@/lib/health-score/kpi/risk-modifiers";
import { clearHealthKpiRegistry } from "@/lib/health-score/registry/kpi-registry";
import { clearHealthSectionRegistry } from "@/lib/health-score/registry/section-registry";
import { clearRiskModifierRegistry } from "@/lib/health-score/registry/risk-modifier-registry";
import { registerDefaultHealthSections } from "@/lib/health-score/sections/register-sections";

let bootstrapped = false;

/** Idempotent bootstrap — call before engine run. */
export function ensureHealthScoreRegistry(): void {
  if (bootstrapped) return;
  registerDefaultHealthSections();
  registerDefaultHealthKpis();
  registerDefaultRiskModifiers();
  bootstrapped = true;
}

/** Test helper. */
export function resetHealthScoreRegistry(): void {
  bootstrapped = false;
  clearHealthKpiRegistry();
  clearHealthSectionRegistry();
  clearRiskModifierRegistry();
}
