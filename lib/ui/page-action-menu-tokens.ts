import { GLOBAL_DROPDOWN_PORTAL_Z } from "@/lib/ui/global-dropdown-portal";
import { globalDropdownPortalEnterClass } from "@/lib/ui/global-input";

export const PAGE_ACTION_MENU_PANEL_WIDTH = 380;
export const PAGE_ACTION_MENU_PANEL_MIN_WIDTH = 360;
export const PAGE_ACTION_MENU_PANEL_MAX_WIDTH = 420;

export const pageActionMenuPanelClass = [
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)]",
  "bg-[var(--cab-card)] shadow-[var(--cab-shadow-lg)]",
  globalDropdownPortalEnterClass,
].join(" ");

export const pageActionMenuPanelZIndex = GLOBAL_DROPDOWN_PORTAL_Z;

export const pageActionMenuItemClass =
  "flex w-full min-w-0 items-start gap-3 rounded-[var(--ds-radius-md)] px-3 py-2.5 text-left transition-colors hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cab-primary)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

export const pageActionMenuItemDangerClass = "text-[color:var(--cab-danger)]";

export const pageActionMenuItemIconClass =
  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--ds-radius-md)] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] text-[color:var(--cab-text)]";

export const pageActionMenuItemTitleClass = "text-sm font-medium leading-snug text-[color:var(--cab-text)]";

export const pageActionMenuItemDescClass = "mt-0.5 text-xs leading-snug text-[color:var(--cab-text-muted)]";

export const pageActionMenuBadgeClass =
  "inline-flex shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-primary)]";

export const pageActionMenuDividerClass = "my-1 h-px bg-[color:var(--cab-border)]";

export const pageActionMenuSectionLabelClass =
  "px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--cab-text-muted)]";

export const pageActionMenuHeaderClass =
  "flex items-center justify-between gap-2 border-b border-[color:var(--cab-border)] px-2 py-2";

export const pageActionMenuFooterClass =
  "border-t border-[color:var(--cab-border)] px-3 py-2";

export function formatPageActionBadge(value: string | number): string {
  if (typeof value === "number" && value > 99) return "99+";
  return String(value);
}
