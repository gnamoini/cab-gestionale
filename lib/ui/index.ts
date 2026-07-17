export * from "@/lib/ui/design-system";
export * from "@/lib/ui/global-flex-system";
export {
  FlexSystemCharter,
  FLEX_SAFE_MODES,
  FLEX_BASE_RULES,
  FLEX_ENFORCEMENT_LAYERS,
  UI_OS_FLEX_INTEGRATION,
  FLEX_AUDIT_HYDRATION_DELAY_MS,
} from "@/lib/ui/flex-system-policy";
export * from "@/lib/ui/responsive-layout-core";
export * from "@/lib/ui/mobile-modal-behavior";
export * from "@/lib/ui/focus-visibility-flags";
export * from "@/lib/ui/focus-visibility-pipeline";
export {
  runResponsiveLayoutAudit,
  emitResponsiveLayoutAuditWarnings,
  runFlexSystemAudit,
  emitFlexSystemAuditWarnings,
  type ResponsiveLayoutFinding,
  type ResponsiveLayoutAuditResult,
  type FlexSystemAuditResult,
} from "@/lib/ui/responsive-layout-audit";
export {
  runMobileModalAudit,
  emitMobileModalAuditWarnings,
  type MobileModalFinding,
} from "@/lib/ui/mobile-modal-audit";
export {
  runVisualLayoutLinter,
  emitVisualLayoutLinterWarnings,
  type LayoutScore,
  type VisualLayoutLinterResult,
} from "@/lib/ui-visual-linter/visual-layout-linter";
export {
  runUIAutonomyFixEngine,
  runUIAutonomyFixEngineFromMain,
  emitUIAutonomyFixReport,
  type UIAutonomyFixResult,
} from "@/lib/ui-autonomy-fix/ui-autonomy-engine";
export {
  validateComponentTree,
  runDesignSystemLockOnFile,
  emitDesignSystemLockWarnings,
  DS_LOCK_MESSAGE,
  type DesignSystemViolation,
} from "@/lib/ui-design-system-lock/design-system-lock";
export {
  buildShadowReport,
  emitUIOsShadowReport,
  validateUISchema,
  UI_OS_OPT_IN_PAGES,
  DEFAULT_PAGE_SCHEMA,
  runUIOsValidationPipeline,
  DRIFT_ALLOW_THRESHOLD,
  type UIPageSchema,
  type UIOsShadowReport,
  type UIOsRenderDecision,
} from "@/lib/ui-os";
