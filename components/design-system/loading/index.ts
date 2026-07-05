/**
 * CAB Gestionale — loading design system (single source).
 */

export {
  LOADING_SPINNER_DURATION_MS,
  LOADING_DELAYED_MESSAGE_MS,
  loadingSpinnerSizeClass,
  loadingSpinnerRingClass,
  loadingSkeletonPulseClass,
  loadingMessageClass,
  loadingCaptionClass,
  type LoadingSpinnerSize,
} from "./loading-tokens";

export { LoadingSpinner, type LoadingSpinnerProps } from "./loading-spinner";
export {
  LoadingSkeleton,
  LoadingSkeletonLine,
  LoadingSkeletonBlock,
} from "./loading-skeleton";
export { LoadingProgressBar, type LoadingProgressBarProps } from "./loading-progress-bar";
export {
  LoadingView,
  LoadingOverlay,
  LoadingPageFallback,
  type LoadingViewProps,
  type LoadingOverlayProps,
  type LoadingPageFallbackProps,
} from "./loading-overlay";
export { LoadingStateMessage, type LoadingStateMessageProps } from "./loading-state-message";
export { LoadingErrorState, type LoadingErrorStateProps } from "./loading-error-state";
export {
  LoadingPageSkeleton,
  type LoadingPageSkeletonProps,
  type LoadingPageSkeletonVariant,
} from "./loading-page-skeleton";
export { LoadingSuspenseFallback, type LoadingSuspenseFallbackProps } from "./loading-suspense-fallback";
export { LoadingDashboardSkeleton } from "./loading-dashboard-skeleton";
export { LoadingDipendentiSkeleton } from "./loading-dipendenti-skeleton";
export { LoadingKanbanSkeleton } from "./loading-kanban-skeleton";
export { LoadingLavorazioniListSkeleton } from "./loading-lavorazioni-list-skeleton";
export { LoadingLavorazioneMobileCardSkeleton } from "./loading-lavorazione-mobile-card-skeleton";
export { LoadingMagazzinoListSkeleton } from "./loading-magazzino-list-skeleton";
export { LoadingMezziListSkeleton } from "./loading-mezzi-list-skeleton";
export { LoadingDocumentiListSkeleton } from "./loading-documenti-list-skeleton";
export { LoadingPreventiviListSkeleton } from "./loading-preventivi-list-skeleton";
export { LoadingReportSkeleton } from "./loading-report-skeleton";
export { LoadingImpostazioniSkeleton } from "./loading-impostazioni-skeleton";
export { LoadingAgendaSkeleton, LoadingAgendaContentSkeleton } from "./loading-agenda-skeleton";
export { LoadingFatturazioneSkeleton, LoadingFatturazioneListSkeleton } from "./loading-fatturazione-skeleton";
export { LoadingSicurezzaSkeleton } from "./loading-sicurezza-skeleton";
export { LoadingProductionReadinessSkeleton } from "./loading-production-readiness-skeleton";
export { LoadingLoginSkeleton } from "./loading-login-skeleton";
export { LoadingClientDetailSkeleton } from "./loading-client-detail-skeleton";
export { LoadingToolbarSkeleton } from "./loading-toolbar-skeleton";
export { LoadingCardSkeleton, type LoadingCardSkeletonProps } from "./loading-card-skeleton";
export {
  LoadingTableSkeleton,
  type LoadingTableSkeletonProps,
  type LoadingTablePreset,
} from "./loading-table-skeleton";
export { LoadingFormSkeleton, type LoadingFormSkeletonProps } from "./loading-form-skeleton";
export { LoadingUploadProgress, type LoadingUploadProgressProps } from "./loading-upload-progress";
export { LoadingButton, type LoadingButtonProps, type LoadingButtonPreset } from "./loading-button";
export { useDelayedLoadingMessage } from "./use-delayed-loading-message";
export { SKELETON_MIN_HEIGHT, SKELETON_GRID } from "./skeleton-layout-presets";
export {
  SkeletonBlock,
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
  SkeletonForm,
  SkeletonModal,
  SkeletonDashboardWidget,
  type SkeletonBlockProps,
  type SkeletonCardProps,
  type SkeletonTableProps,
  type SkeletonChartProps,
  type SkeletonFormProps,
  type SkeletonModalProps,
  type SkeletonDashboardWidgetProps,
  type SkeletonDashboardWidgetVariant,
} from "./skeleton-primitives";
export {
  SkeletonShellCard,
  SkeletonShellCardPulseBody,
  skeletonShellCardPulseBodyClass,
  type SkeletonShellCardProps,
  type SkeletonShellCardPulseBodyProps,
} from "./skeleton-shell-card";
export {
  LoadingListPageShell,
  gestionaleListPageStackClass,
  type LoadingListPageShellProps,
} from "./loading-list-page-shell";
export { resolveLoadingPageSkeletonVariant } from "./resolve-loading-page-skeleton-variant";
export { LoadingPageShellSkeleton, type LoadingPageShellSkeletonProps } from "./loading-page-shell-skeleton";

/** Alias legacy — stesso componente. */
export { LoadingSpinner as GlobalLoadingSpinner } from "./loading-spinner";
export { LoadingView as GlobalLoadingView } from "./loading-overlay";
export { LoadingOverlay as GlobalLoadingOverlay } from "./loading-overlay";
export { LoadingPageFallback as GlobalLoadingPageFallback } from "./loading-overlay";
export type { LoadingSpinnerSize as GlobalLoadingSpinnerSize } from "./loading-tokens";
