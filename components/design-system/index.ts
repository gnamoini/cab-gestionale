/**
 * CAB Gestionale — Design System (componenti React).
 * Token CSS e classi Tailwind: `@/lib/ui/design-system`.
 */

export { Button, PrimaryActionButton, type DsButtonProps, type DsButtonVariant } from "./button";
export { IconButton, type IconButtonProps } from "./icon-button";
export { IconActionButton, type IconActionButtonProps } from "./icon-action-button";
export { Tooltip, type TooltipProps } from "./tooltip";
export { CloseButton, type CloseButtonProps } from "./close-button";
export { Badge, type BadgeTone } from "./badge";
export { EntitySimilarWarning, useEntitySimilarWarning } from "./entity-similar-warning";
export { SearchBar, GESTIONALE_SEARCH_PLACEHOLDER, type SearchBarProps } from "./search-bar";
export { FormField, formInputClass, formTextareaClass } from "./form-field";
export { PageLayout, type PageLayoutProps } from "./page-layout";
export {
  PageToolbar,
  PageToolbarResultCount,
  PageToolbarActions,
  type PageToolbarProps,
} from "./page-toolbar";
export { FiltersBar, type FiltersBarProps } from "./filters-bar";
export { DataTable, type DataTableProps } from "./data-table";
export {
  GlobalTable,
  GlobalTableSortTh,
  GlobalTableHeadLabel,
  GlobalTableHead,
  type GlobalTableProps,
  type GlobalTableSortPhase,
} from "@/components/gestionale/global-table";
export { CardMobile, CardMobileActions, dsCardMobileShell } from "./card-mobile-actions";
export { Modal, type ModalProps } from "./modal";
export { Drawer, type DrawerProps } from "./drawer";
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
