/**
 * CAB Gestionale — Design System (componenti React).
 * Token CSS e classi Tailwind: `@/lib/ui/design-system`.
 */

export { Button, PrimaryActionButton, type DsButtonProps, type DsButtonVariant } from "./button";
export { IconButton, type IconButtonProps } from "./icon-button";
export { IconActionButton, type IconActionButtonProps } from "./icon-action-button";
export { Tooltip, type TooltipProps } from "./tooltip";
export { TruncatedTextTooltip } from "./truncated-text-tooltip";
export { CloseButton, type CloseButtonProps } from "./close-button";
export { Badge, type BadgeTone } from "./badge";
export { EntitySimilarWarning, useEntitySimilarWarning } from "./entity-similar-warning";
export { SearchBar, GESTIONALE_SEARCH_PLACEHOLDER, type SearchBarProps } from "./search-bar";
export { FormField, formInputClass, formTextareaClass } from "./form-field";
export { PageLayout, type PageLayoutProps } from "./page-layout";
export {
  PageToolbar,
  PageToolbarCtaLabel,
  PageToolbarOverflowAction,
  PageToolbarResultCount,
  PageToolbarActions,
  type PageToolbarProps,
} from "./page-toolbar";
export {
  ToolbarGroup,
  ToolbarGroupBody,
  ToolbarGroupSearchRow,
  ToolbarGroupPrimaryRow,
  ToolbarGroupFiltersToggle,
  ToolbarGroupOverflowToggle,
  ToolbarGroupMetaRow,
  ToolbarGroupUtilityRow,
  ToolbarGroupFiltersCollapse,
  type ToolbarGroupProps,
} from "./toolbar-group";
export { FiltersBar, type FiltersBarProps } from "./filters-bar";
export {
  GlobalTable,
  GlobalTableSortTh,
  GlobalTableHeadLabel,
  GlobalTableHead,
  type GlobalTableProps,
  type GlobalTableSortPhase,
} from "@/components/gestionale/global-table";
export { CardMobile, CardMobileActions, dsCardMobileShell } from "./card-mobile-actions";
export {
  GestionaleInfoCard,
  GestionaleInfoMetricRow,
  GestionaleInfoRow,
  GestionaleInfoSubgroup,
} from "./gestionale-info-card";
export { Modal, type ModalProps } from "./modal";
export { Drawer, type DrawerProps } from "./drawer";
export { HubModalTab, HubModalTabBar, type HubModalTabBarProps, type HubModalTabProps } from "./hub-modal-tab-bar";
export {
  HubModalPanoramicaField,
  HubModalPanoramicaFieldGrid,
  HubModalPanoramicaFieldGroup,
  HubModalPanoramicaFieldTile,
  HubModalPanoramicaFieldTileShell,
  HubModalPanoramicaFieldTiles,
  HubModalPanoramicaInlineCell,
  HubModalPanoramicaInlineGrid,
  HubModalPanoramicaKpiCell,
  HubModalPanoramicaKpiGrid,
  HubModalPanoramicaNoteEditor,
  HubModalPanoramicaPanel,
  HubModalPanoramicaSection,
  HubModalPanoramicaStatusPill,
  HubModalPanoramicaSubsection,
  HubModalPanoramicaSummary,
  HubModalPanoramicaSummaryItem,
  hubPanoramicaDisplayValue,
} from "./hub-modal-panoramica";
export { LogEntry, LogEntryRenderer, type LogEntryProps } from "./log-entry";

export { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
export {
  GlobalLoadingSpinner,
  GlobalLoadingView,
  GlobalLoadingOverlay,
  GlobalLoadingPageFallback,
  type GlobalLoadingSpinnerSize,
} from "./global-loading";
export { LoadingSpinner, PageLoadingOverlay } from "./loading-indicator";
export {
  LoadingSpinner as DsLoadingSpinner,
  LoadingSkeleton,
  LoadingSkeletonLine,
  LoadingSkeletonBlock,
  LoadingProgressBar,
  LoadingView,
  LoadingOverlay,
  LoadingPageFallback,
  LoadingStateMessage,
  LoadingErrorState,
  LoadingPageSkeleton,
  LoadingSuspenseFallback,
  LoadingDashboardSkeleton,
  LoadingDipendentiSkeleton,
  LoadingKanbanSkeleton,
  LoadingLavorazioniListSkeleton,
  LoadingMagazzinoListSkeleton,
  LoadingReportSkeleton,
  LoadingImpostazioniSkeleton,
  LoadingLoginSkeleton,
  LoadingClientDetailSkeleton,
  LoadingCardSkeleton,
  LoadingTableSkeleton,
  LoadingFormSkeleton,
  LoadingUploadProgress,
  LoadingButton,
  useDelayedLoadingMessage,
  type LoadingTablePreset,
  type LoadingPageSkeletonVariant,
  type LoadingButtonPreset,
} from "./loading";
