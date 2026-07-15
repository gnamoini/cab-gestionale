"use client";

import { memo, useCallback, type KeyboardEvent } from "react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/design-system/loading";
import { OptionalTooltip } from "@/components/ui";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import {
  formatPageActionBadge,
  pageActionMenuBadgeClass,
  pageActionMenuItemClass,
  pageActionMenuItemDangerClass,
  pageActionMenuItemDescClass,
  pageActionMenuItemIconClass,
  pageActionMenuItemTitleClass,
  pageActionMenuSectionLabelClass,
} from "@/lib/ui/page-action-menu-tokens";
import type { PageActionItem } from "@/components/ui/page-action-menu/page-action-menu-types";

function IconChevron({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export type PageActionMenuItemProps = {
  item: PageActionItem;
  onActivate: (item: PageActionItem) => void;
  showSectionLabel?: boolean;
  tabIndex?: number;
  onFocus?: () => void;
};

export const PageActionMenuItem = memo(function PageActionMenuItem({
  item,
  onActivate,
  showSectionLabel = false,
  tabIndex = -1,
  onFocus,
}: PageActionMenuItemProps) {
  const disabled = item.disabled || item.loading;
  const tooltip = disabled ? (item.disabledReason ?? READONLY_PERMISSION_HINT) : undefined;
  const hasSubmenu = Boolean(item.submenu && item.submenu.length > 0);
  const showChevron = item.chevron ?? hasSubmenu;

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (item.toggle) {
      item.toggle.onChange(!item.toggle.checked);
      return;
    }
    onActivate(item);
  }, [disabled, item, onActivate]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  const rowClass = `${pageActionMenuItemClass}${item.danger ? ` ${pageActionMenuItemDangerClass}` : ""}`;

  const content = (
    <>
      {item.icon ? <span className={pageActionMenuItemIconClass}>{item.icon}</span> : <span className="w-9 shrink-0" aria-hidden />}
      <span className="min-w-0 flex-1">
        {showSectionLabel && item.sectionLabel ? (
          <span className={pageActionMenuSectionLabelClass}>{item.sectionLabel}</span>
        ) : null}
        <span className="flex min-w-0 items-center gap-2">
          <span className={pageActionMenuItemTitleClass}>{item.label}</span>
          {item.badge != null ? (
            <span className={pageActionMenuBadgeClass}>{formatPageActionBadge(item.badge)}</span>
          ) : null}
        </span>
        {item.description ? <p className={pageActionMenuItemDescClass}>{item.description}</p> : null}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 self-center">
        {item.loading ? <LoadingSpinner size="sm" label="Caricamento…" /> : null}
        {item.shortcut ? (
          <kbd className="hidden text-[10px] text-[color:var(--cab-text-muted)] sm:inline">{item.shortcut}</kbd>
        ) : null}
        {showChevron ? <IconChevron className="h-4 w-4 text-[color:var(--cab-text-muted)]" /> : null}
        {item.toggle ? (
          <span
            role="switch"
            aria-checked={item.toggle.checked}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
              item.toggle.checked
                ? "bg-[color:var(--cab-primary)]"
                : "bg-[color:color-mix(in_srgb,var(--cab-border)_80%,var(--cab-surface))]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                item.toggle.checked ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </span>
        ) : null}
      </span>
    </>
  );

  const itemEl =
    item.href && !hasSubmenu && !item.toggle ? (
      <Link
        href={item.href}
        className={rowClass}
        tabIndex={tabIndex}
        onFocus={onFocus}
        aria-disabled={disabled}
        data-testid={`page-action-menu-item-${item.id}`}
      >
        {content}
      </Link>
    ) : (
      <button
        type="button"
        role="menuitem"
        className={rowClass}
        disabled={disabled}
        aria-busy={item.loading}
        tabIndex={tabIndex}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        data-testid={`page-action-menu-item-${item.id}`}
      >
        {content}
      </button>
    );

  return (
    <li role="none">
      {tooltip ? <OptionalTooltip content={tooltip}>{itemEl}</OptionalTooltip> : itemEl}
    </li>
  );
});
