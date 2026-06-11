/**
 * Policy SSOT per domini selector — thin delegate al SelectorDecisionEngine (v3/v3.1).
 */
export type {
  DecisionRuleBand,
  SelectorDomain,
  SheetRolloutStatus,
} from "@/lib/selector-core/types";

export {
  MOBILE_SHEET_MIN_OPTIONS,
  SELECTOR_SHEET_ROLLOUT_BY_DOMAIN,
  isSelectOnlyPolicyViolationPublic as isSelectOnlyPolicyViolation,
  isSelectorDomainSheetRolloutEnabled,
  isSelectorSheetEligible,
  resolveDecisionRuleBand,
  shouldUpgradeToSearch,
  warnSelectOnlyPolicyViolation,
} from "@/lib/selector-core/selector-decision-engine";

export { SELECTOR_SECURITY_GRADUAL_ENABLED } from "@/lib/selector-core/selector-engine-config";

export type SelectOnlyPolicyContext = {
  selectOnly: boolean;
  domain?: import("@/lib/selector-core/types").SelectorDomain;
  dynamicList?: boolean;
  operationalFilter?: boolean;
};
