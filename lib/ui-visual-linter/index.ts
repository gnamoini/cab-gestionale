export {
  parsePx,
  classifyTableDensity,
  styleSnapshotFromDeclaration,
  extractToolbarSignatureFromStyles,
  extractTableSignatureFromStyles,
  extractModalSignatureFromStyles,
  extractFlexGroupSignatureFromStyles,
  collectLayoutSignatures,
  type LayoutSignature,
  type ToolbarSignature,
  type TableSignature,
  type ModalSignature,
  type FlexGroupSignature,
  type StyleSnapshot,
} from "@/lib/ui-visual-linter/layout-signature";

export {
  CANONICAL,
  VISUAL_LAYOUT_ALLOWLIST,
  shouldSkipElement,
  evaluateSignatureRules,
  evaluateToolbarRules,
  evaluateTableRules,
  evaluateModalRules,
  evaluateFlexGroupRules,
  type LayoutLinterIssue,
  type LayoutRuleId,
} from "@/lib/ui-visual-linter/layout-rules";

export {
  detectCrossInstanceDrift,
  dedupeIssues,
  issueFingerprint,
} from "@/lib/ui-visual-linter/layout-diff-engine";

export {
  computeLayoutScore,
  layoutScoreRiskLevel,
  type LayoutScore,
} from "@/lib/ui-visual-linter/layout-score";

export {
  runVisualLayoutLinter,
  emitVisualLayoutLinterWarnings,
  runVisualLayoutLinterFromMain,
  runVisualLayoutLinterOnModal,
  LAYOUT_LINTER_LOG_PREFIX,
  type VisualLayoutLinterResult,
} from "@/lib/ui-visual-linter/visual-layout-linter";

export { useVisualLayoutLinter, useDevModalLayoutLint } from "@/lib/ui-visual-linter/use-visual-layout-linter";
