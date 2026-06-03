export {
  type ToolbarVariant,
  type TableVariant,
  type ModalVariant,
  type LayoutVariant,
  type UIDensity,
  type UIPageSchema,
  type UIPageMode,
  DEFAULT_PAGE_SCHEMA,
  SUGGESTED_PAGE_SCHEMAS,
  getSuggestedSchema,
  normalizePageId,
  UI_OS_SHADOW_LOG_PREFIX,
} from "@/lib/ui-os/ui-schema";

export {
  type UIContract,
  type UIContractType,
  TOOLBAR_VARIANT_CONTRACTS,
  TABLE_VARIANT_CONTRACTS,
  MODAL_VARIANT_CONTRACTS,
  LAYOUT_VARIANT_CONTRACTS,
  getContractForSchemaField,
} from "@/lib/ui-os/ui-contracts";

export {
  inferPageSchemaFromDom,
  inferPageSchemaFromSource,
  diffSchemas,
  schemaMatchScore,
  isPageAllowlisted,
  enrichDetectedSchema,
  suggestSchemaHints,
  UI_OS_MIGRATION_LOG_PREFIX,
} from "@/lib/ui-os/ui-migration-layer";

export {
  resolveUIComponent,
  resolveUIComponents,
  resolveToolbarComponent,
  resolveTableShell,
  resolveModalShell,
  resolveLayoutShell,
  type ResolvedUIComponents,
} from "@/lib/ui-os/ui-resolver";

export {
  validateUISchema,
  detectUIContractViolations,
  buildShadowReport,
  emitUIOsShadowReport,
  computeDriftScore,
  getPageUIMode,
  UI_OS_OPT_IN_PAGES,
  type UIOsShadowReport,
  type UISchemaValidationResult,
} from "@/lib/ui-os/ui-os-engine";

export {
  DRIFT_ALLOW_THRESHOLD,
  DRIFT_BLOCK_THRESHOLD,
  UI_OS_PHASE2_LOG_PREFIX,
  UI_OS_FALLBACK_LOG_PREFIX,
  validateFlexSafety,
  evaluateRenderDecision,
  runUIOsValidationPipeline,
  layoutDriftLevel,
  type UIOsRenderDecision,
  type UIOsRenderPrimary,
  type UIOsFallbackReason,
} from "@/lib/ui-os/ui-render-decision";

export {
  buildPhase2CompareReport,
  emitPhase2CompareReport,
  type UIOsPhase2CompareReport,
} from "@/lib/ui-os/ui-phase2-compare";

export {
  ToolbarStandardShell,
  ToolbarCompactShell,
  ToolbarLegacyShell,
  GlobalTableShell,
  LegacyTableShell,
  DsModalShell,
  GestionaleModalShell,
  GestionaleCoreLayout,
  ReportDashboardLayout,
  resolveToolbarShell,
  resolveTableShellComponent,
  resolveModalShellComponent,
  resolveLayoutShellComponent,
  type UIShellComponent,
} from "@/lib/ui-os/ui-layout-shells";

export { UIRenderer, type UIRendererProps, type UIRendererSlots } from "@/lib/ui-os/ui-renderer";
export { UIPageAdapter, type UIPageAdapterProps, type UIPageFallbackMode } from "@/lib/ui-os/ui-backward-adapter";
export { UiOsErrorBoundary } from "@/lib/ui-os/ui-os-error-boundary";
export { useUIOsShadow } from "@/lib/ui-os/use-ui-os-shadow";
export { useUIOsPhase2 } from "@/lib/ui-os/use-ui-os-phase2";
