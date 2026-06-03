export {
  isDevFixEnabled,
  isElementAllowlisted,
  validateFixSafety,
  assessFixRisk,
  wouldChangeLayoutHierarchy,
  type FixRiskLevel,
  type FixSafetyResult,
} from "@/lib/ui-autonomy-fix/fix-safety-guard";

export {
  LAYOUT_FIX_POLICIES,
  isIssueAutoFixable,
  partitionIssues,
  issueRiskLevel,
  type RuleFixPolicy,
} from "@/lib/ui-autonomy-fix/layout-fix-rules";

export {
  strategyForIssue,
  strategiesForIssues,
  toolbarFlexSafeRowFix,
  type UIFix,
  type UIFixAction,
} from "@/lib/ui-autonomy-fix/fix-strategies";

export {
  findElementByDescriptor,
  resolveFixTarget,
  applyFixToElement,
  applyFixes,
  UI_AUTONOMY_APPLIED_ATTR,
  type AppliedFix,
  type ApplyFixResult,
} from "@/lib/ui-autonomy-fix/fix-apply-engine";

export {
  runUIAutonomyFixEngine,
  runUIAutonomyFixEngineFromMain,
  emitUIAutonomyFixReport,
  runAndEmitUIAutonomyFix,
  UI_AUTONOMY_FIX_LOG_PREFIX,
  type UIAutonomyFixResult,
} from "@/lib/ui-autonomy-fix/ui-autonomy-engine";

export { useUIAutonomyFixEngine } from "@/lib/ui-autonomy-fix/use-ui-autonomy-fix-engine";
