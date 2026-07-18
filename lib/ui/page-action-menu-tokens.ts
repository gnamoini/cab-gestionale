import { GLOBAL_DROPDOWN_PORTAL_Z } from "@/lib/ui/global-dropdown-portal";
import { globalDropdownPortalEnterClass } from "@/lib/ui/global-input";
import { dsPageHeaderIconBtn } from "@/lib/ui/design-system";

export const PAGE_ACTION_MENU_PANEL_WIDTH = 320;
export const PAGE_ACTION_MENU_PANEL_MIN_WIDTH = 300;
export const PAGE_ACTION_MENU_PANEL_MAX_WIDTH = 360;
/** Altezza massima portal — menu esteso senza scroll visibile su liste tipiche. */
export const PAGE_ACTION_MENU_PANEL_MAX_HEIGHT = 680;

export const pageActionMenuPortalScrollClass =
  "overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export const pageActionMenuPanelClass = [
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)]",
  "bg-[var(--cab-card)] shadow-[var(--cab-shadow-lg)]",
  globalDropdownPortalEnterClass,
].join(" ");

export const pageActionMenuPanelZIndex = GLOBAL_DROPDOWN_PORTAL_Z;

export const pageActionMenuItemClass =
  "flex w-full min-w-0 items-start gap-3 rounded-none px-3 py-2.5 text-left transition-colors duration-150 ease-out hover:bg-[var(--cab-hover)] focus-visible:outline-none focus-visible:bg-[var(--cab-hover)] disabled:cursor-not-allowed disabled:opacity-50";

export const pageActionMenuItemDangerClass = "text-[color:var(--cab-danger)]";

export const pageActionMenuItemIconClass =
  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[color:var(--cab-text-muted)]";

export const pageActionMenuItemIconDangerClass = "text-[color:var(--cab-danger)]";

export const pageActionMenuItemTitleClass = "text-sm font-medium leading-snug text-[color:var(--cab-text)]";

export const pageActionMenuItemDescClass = "mt-0.5 text-xs leading-snug text-[color:var(--cab-text-muted)]";

export const pageActionMenuBadgeClass =
  "inline-flex shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-primary)]";

export const pageActionMenuDividerClass = "my-0 h-px bg-[color:var(--cab-border)]";

export const pageActionMenuSectionLabelClass =
  "px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--cab-text-muted)]";

export const pageActionMenuHeaderClass =
  "flex items-center gap-2 border-b border-[color:var(--cab-border)] px-2 py-2";

/** Ghost icona barra azioni rapide — allineato header mobile (no bordo). */
export const pageActionMenuQuickActionIconBtn = dsPageHeaderIconBtn;

export const pageActionMenuQuickActionsBarClass =
  "flex min-w-0 flex-nowrap items-center justify-start gap-1.5";

export const pageActionMenuFooterClass =
  "border-t border-[color:var(--cab-border)] px-3 py-2";

export function formatPageActionBadge(value: string | number): string {
  if (typeof value === "number" && value > 99) return "99+";
  return String(value);
}
