/**
 * CAB Gestionale — Design System (componenti React).
 * Token CSS e classi Tailwind: `@/lib/ui/design-system`.
 */

export { Button, PrimaryActionButton, type DsButtonProps, type DsButtonVariant } from "./button";
export {
  GestionaleAiActionButton,
  type GestionaleAiActionButtonProps,
  type GestionaleAiActionButtonSize,
  type GestionaleAiActionButtonVariant,
} from "./gestionale-ai-action-button";
export { GeminiSparkIcon } from "./gemini-spark-icon";
export { IconButton, type IconButtonProps } from "./icon-button";
export { IconActionButton, type IconActionButtonProps } from "./icon-action-button";
export { Tooltip, type TooltipProps } from "./tooltip";
export { TruncatedTextTooltip } from "./truncated-text-tooltip";
export { DisabledElementTooltip, type DisabledElementTooltipProps } from "./disabled-element-tooltip";
export { OptionalTooltip, type OptionalTooltipProps } from "./optional-tooltip";
export { TooltipList, type TooltipListProps } from "./tooltip-list";
export {
  TooltipStatus,
  type TooltipStatusProps,
  type TooltipStatusLine,
  MAX_TOOLTIP_STATUS_LINES,
  clampTooltipStatusLines,
} from "./tooltip-status";
export { CloseButton, type CloseButtonProps } from "./close-button";
export {
  SystemBannerChips,
  SystemBannerDismiss,
  SystemBannerLayout,
  SystemBannerShell,
} from "./system-banner";
export {
  ShellNavBackButton,
  ShellNavBackLink,
} from "./shell-nav-icon-button";
export {
  ShellNavIconBack,
  ShellNavIconClose,
  ShellNavIconMenu,
  ShellNavIconRefresh,
  type ShellNavIconProps,
} from "./shell-nav-icons";
export { Badge, type BadgeTone } from "./badge";
export { EntitySimilarWarning, useEntitySimilarWarning } from "./entity-similar-warning";
export { SearchBar, GESTIONALE_SEARCH_PLACEHOLDER, type SearchBarProps } from "./search-bar";
export { FormField, formInputClass, formTextareaClass } from "./form-field";
export { GestionaleTextarea, type GestionaleTextareaProps, type GestionaleTextareaSize } from "@/components/gestionale/gestionale-textarea";
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
export {
  GestionaleCollapsibleChevronBox,
  GestionaleCollapsibleChevronIcon,
} from "./gestionale-collapsible-chevron";
export { GestionaleCollapsibleHeader } from "./gestionale-collapsible-header";
export {
  GestionaleCollapsibleSection,
  gestionaleCollapsibleSectionDefaultClass,
  gestionaleCollapsibleSectionFormClass,
  gestionaleCollapsibleSectionTitleClass,
  gestionaleCollapsibleSectionTitleClassName,
  type GestionaleCollapsibleSectionTitleTone,
  type GestionaleCollapsibleSectionVariant,
} from "./gestionale-collapsible-section";
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
} from "./loading";
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
  LoadingMezziListSkeleton,
  LoadingDocumentiListSkeleton,
  LoadingPreventiviListSkeleton,
  LoadingReportSkeleton,
  LoadingImpostazioniSkeleton,
  LoadingAgendaSkeleton,
  LoadingAgendaContentSkeleton,
  LoadingFatturazioneSkeleton,
  LoadingFatturazioneListSkeleton,
  LoadingSicurezzaSkeleton,
  LoadingProductionReadinessSkeleton,
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
export {
  NotificationBellIcon,
  NotificationBellTrigger,
  NotificationCountBadge,
  NotificationDangerDetail,
  NotificationEmptyState,
  NotificationList,
  NotificationMetaLine,
  NotificationOpenLink,
  NotificationPanelHeader,
  NotificationPanelHint,
  NotificationPanelShell,
  NotificationQtyChip,
  NotificationRowBody,
  NotificationRowDismiss,
  NotificationRowHeader,
  NotificationRowShell,
  NotificationRowSurface,
  NotificationSottoScortaRow,
  type NotificationBellActiveTone,
} from "./notifications/notification-primitives";
