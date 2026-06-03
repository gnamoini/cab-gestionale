export {
  DS_LOCK_MESSAGE_PREFIX,
  TOOLBAR_CONTRACT,
  TABLE_CONTRACT,
  MODAL_CONTRACT,
  FLEX_CONTRACT,
  DS_LOCK_FILE_ALLOWLIST,
  DS_LOCK_CLASS_ALLOWLIST,
  isFileAllowlisted,
  isClassAllowlisted,
} from "@/lib/ui-design-system-lock/component-contracts";

export { DS_LOCK_MESSAGE } from "@/lib/ui-design-system-lock/design-system-lock";

export { FORBIDDEN_PATTERNS, PATTERN_MATCHERS } from "@/lib/ui-design-system-lock/forbidden-patterns";

export {
  DS_ENFORCEMENT_RULES,
  type DesignSystemRuleId,
  type RulePolicy,
} from "@/lib/ui-design-system-lock/ds-enforcement-rules";

export {
  validateComponentTree,
  validateClassName,
  validateFileContent,
  dedupeViolations,
  violationFingerprint,
  type ComponentTreeNode,
  type ContractValidationResult,
  type DesignSystemViolation,
} from "@/lib/ui-design-system-lock/layout-contract-validator";

export {
  isInBaseline,
  filterNonBaselineViolations,
  getBaselineEntries,
  runDesignSystemLockOnFile,
  runDesignSystemLockOnTree,
  runDesignSystemLockOnDom,
  emitDesignSystemLockWarnings,
  type BaselineEntry,
  type BaselineFile,
} from "@/lib/ui-design-system-lock/design-system-lock";
