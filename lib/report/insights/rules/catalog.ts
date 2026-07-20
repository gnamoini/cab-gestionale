import { COMPLIANCE_INSIGHT_RULES } from "@/lib/report/insights/rules/compliance.rules";
import { CROSS_INSIGHT_RULES } from "@/lib/report/insights/rules/cross.rules";
import { ECONOMICO_INSIGHT_RULES } from "@/lib/report/insights/rules/economico.rules";
import { LAVORAZIONI_INSIGHT_RULES } from "@/lib/report/insights/rules/lavorazioni.rules";
import { MAGAZZINO_INSIGHT_RULES } from "@/lib/report/insights/rules/magazzino.rules";
import { ORE_INSIGHT_RULES } from "@/lib/report/insights/rules/ore.rules";
import { INSIGHT_P0_RULE_COUNT } from "@/lib/report/insights/types";

export {
  LAVORAZIONI_INSIGHT_RULES,
  MAGAZZINO_INSIGHT_RULES,
  ORE_INSIGHT_RULES,
  ECONOMICO_INSIGHT_RULES,
  CROSS_INSIGHT_RULES,
  COMPLIANCE_INSIGHT_RULES,
};

export const ALL_INSIGHT_RULES = [
  ...LAVORAZIONI_INSIGHT_RULES,
  ...MAGAZZINO_INSIGHT_RULES,
  ...ORE_INSIGHT_RULES,
  ...ECONOMICO_INSIGHT_RULES,
  ...CROSS_INSIGHT_RULES,
  ...COMPLIANCE_INSIGHT_RULES,
] as const;

if (ALL_INSIGHT_RULES.length !== INSIGHT_P0_RULE_COUNT) {
  throw new Error(
    `insight catalog: expected ${INSIGHT_P0_RULE_COUNT} rules, got ${ALL_INSIGHT_RULES.length}`,
  );
}
