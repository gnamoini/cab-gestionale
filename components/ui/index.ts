/**
 * Barrel ufficiale — unico entry point consumer per primitive UI governate.
 * @see docs/ui-governance.md
 */

export {
  Tooltip,
  TruncatedTextTooltip,
  DisabledElementTooltip,
  OptionalTooltip,
  TooltipList,
  TooltipStatus,
  type TooltipProps,
  type DisabledElementTooltipProps,
  type OptionalTooltipProps,
  type TooltipListProps,
  type TooltipStatusProps,
  type TooltipStatusLine,
  MAX_TOOLTIP_STATUS_LINES,
  clampTooltipStatusLines,
} from "@/components/design-system";

export {
  GlobalAnchoredMenu,
  GlobalAnchoredMenuItems,
  type GlobalAnchoredMenuItem,
  type GlobalAnchoredMenuProps,
  type GlobalAnchoredMenuItemsProps,
} from "@/components/gestionale/global-input/global-anchored-menu";

export {
  PageActionMenu,
  PageActionMenuItem,
  PageActionMenuDivider,
  PageActionMenuHeader,
  PageActionMenuFooter,
  PageActionMenuProvider,
  usePageActionMenu,
  usePageActionMenuContext,
  usePageActionMenuContextRequired,
  filterPageActionItems,
  mergePageActionGroups,
  pageActionCreateItem,
  pageActionFiltersItem,
  pageActionLogItem,
  pageActionUndoItem,
  clickPageActionHiddenTrigger,
  type PageActionItem,
  type PageActionItemToggle,
  type PageActionMenuBackConfig,
  type PageActionMenuGroup,
  type PageActionMenuProps,
  type PageActionMenuProviderProps,
  type UsePageActionMenuOptions,
} from "@/components/ui/page-action-menu";

export {
  LIST_DIVIDER_UL,
  LIST_ROW_SHELL,
  LIST_EMPTY_STATE,
  LIST_EMPTY_STATE_INLINE,
  LIST_LOADING_STATE,
  LIST_ERROR_STATE,
} from "@/lib/ui/list-primitives";
