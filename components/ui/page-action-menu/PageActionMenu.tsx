"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { LoadingSpinner } from "@/components/design-system/loading";
import { OptionalTooltip } from "@/components/ui";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import { PageActionMenuDivider } from "@/components/ui/page-action-menu/PageActionMenuDivider";
import { PageActionMenuFooter } from "@/components/ui/page-action-menu/PageActionMenuFooter";
import { PageActionMenuHeader, PageActionMenuRefreshButton } from "@/components/ui/page-action-menu/PageActionMenuHeader";
import { PageActionMenuItem } from "@/components/ui/page-action-menu/PageActionMenuItem";
import { filterPageActionItems, getSingletonPageActionListItem, isRefreshOnlyPageActionMenu, pageActionMenuHasAttention, pageActionMenuHasContent, shouldUsePageActionMenuDropdown } from "@/components/ui/page-action-menu/page-action-menu-permissions";
import { usePageActionMenuContext } from "@/components/ui/page-action-menu/PageActionMenuProvider";
import { usePageActionMenuKeyboard } from "@/components/ui/page-action-menu/use-page-action-menu-keyboard";
import type {
  PageActionItem,
  PageActionMenuProps,
} from "@/components/ui/page-action-menu/page-action-menu-types";
import { usePermissionsSnapshot } from "@/src/hooks/use-permissions";
import { useRbac } from "@/src/hooks/use-rbac";
import { resolveMobilePageHeaderBack } from "@/lib/ui/mobile-page-header-nav";
import {
  PAGE_ACTION_MENU_PANEL_MAX_HEIGHT,
  PAGE_ACTION_MENU_PANEL_WIDTH,
  pageActionMenuPanelClass,
  pageActionMenuPortalScrollClass,
} from "@/lib/ui/page-action-menu-tokens";
import { dsPageHeaderIconBtn, dsPageToolbarBtn } from "@/lib/ui/design-system";
import { useDropdownFocusRestore } from "@/lib/ui/use-dropdown-focus-restore";
import { useDialogFocusTrap } from "@/lib/ui/use-dialog-focus-trap";

function IconMoreVertical({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

const PageActionMenuDirectTrigger = memo(function PageActionMenuDirectTrigger({
  item,
  className = "",
  showDot = false,
}: {
  item: PageActionItem;
  className?: string;
  showDot?: boolean;
}) {
  const disabled = item.disabled || item.loading;
  const tooltip = disabled ? (item.disabledReason ?? READONLY_PERMISSION_HINT) : item.label;
  const useIconShell = Boolean(item.icon);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (item.toggle) {
      item.toggle.onChange(!item.toggle.checked);
      return;
    }
    item.onSelect?.();
  }, [disabled, item]);

  const dot = showDot ? (
    <span
      className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[color:var(--cab-primary)] ring-2 ring-[var(--cab-surface)]"
      aria-hidden
    />
  ) : null;

  const shellClass = `${useIconShell ? dsPageHeaderIconBtn : dsPageToolbarBtn} relative shrink-0 gap-1.5${
    className ? ` ${className}` : ""
  }`;

  const inner = (
    <>
      {item.loading ? <LoadingSpinner size="sm" label="Caricamento…" /> : item.icon}
      {!useIconShell ? <span className="max-w-[8rem] truncate">{item.label}</span> : null}
      {dot}
      <span className="sr-only">{item.label}</span>
    </>
  );

  const el =
    item.href && !item.toggle ? (
      <Link
        href={item.href}
        className={shellClass}
        aria-label={item.label}
        aria-disabled={disabled}
        data-testid={`page-action-menu-direct-${item.id}`}
      >
        {inner}
      </Link>
    ) : (
      <button
        type="button"
        className={shellClass}
        onClick={handleClick}
        disabled={disabled}
        aria-busy={item.loading}
        aria-label={item.label}
        data-testid={`page-action-menu-direct-${item.id}`}
      >
        {inner}
      </button>
    );

  return tooltip ? <OptionalTooltip content={tooltip}>{el}</OptionalTooltip> : el;
});

type PanelProps = {
  items: PageActionItem[];
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  refreshBusy?: boolean;
  refreshLabel?: string;
  back?: { href: string; label: string } | null;
  footer?: ReactNode;
  headerActions?: ReactNode;
};

const PageActionMenuPanel = memo(function PageActionMenuPanel({
  items,
  open,
  onClose,
  onRefresh,
  refreshBusy,
  refreshLabel,
  back,
  footer,
  headerActions,
}: PanelProps) {
  const [submenuStack, setSubmenuStack] = useState<PageActionItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const currentSubmenu = submenuStack[submenuStack.length - 1];
  const visibleItems = currentSubmenu?.submenu ?? items;

  useEffect(() => {
    if (!open) {
      setSubmenuStack([]);
      setActiveIndex(0);
    }
  }, [open]);

  usePageActionMenuKeyboard({
    open,
    containerRef: panelRef,
    onClose,
    activeIndex,
    setActiveIndex,
  });

  useDialogFocusTrap(panelRef, open);

  const handleActivate = useCallback(
    (item: PageActionItem) => {
      if (item.submenu && item.submenu.length > 0) {
        setSubmenuStack((s) => [...s, item]);
        setActiveIndex(0);
        return;
      }
      item.onSelect?.();
      if (!item.toggle) onClose();
    },
    [onClose],
  );

  const handleSubmenuBack = useCallback(() => {
    setSubmenuStack((s) => s.slice(0, -1));
    setActiveIndex(0);
  }, []);

  let lastSection: string | undefined;

  const list = (
    <ul id={listId} role="menu" className="m-0 list-none p-0" aria-label="Azioni pagina">
      {visibleItems.map((item, index) => {
        if (item.id === "__divider__") {
          return <PageActionMenuDivider key={`div-${index}`} />;
        }
        const showSection = Boolean(item.sectionLabel && item.sectionLabel !== lastSection);
        if (item.sectionLabel) lastSection = item.sectionLabel;
        return (
          <PageActionMenuItem
            key={item.id}
            item={item}
            onActivate={handleActivate}
            showSectionLabel={showSection}
          />
        );
      })}
    </ul>
  );

  if (!open) return null;

  return (
    <div ref={panelRef} className="flex min-w-0 flex-col">
      <PageActionMenuHeader
        back={currentSubmenu ? null : back}
        onRefresh={currentSubmenu ? undefined : onRefresh}
        refreshBusy={refreshBusy}
        refreshLabel={refreshLabel}
        onSubmenuBack={currentSubmenu ? handleSubmenuBack : undefined}
        submenuTitle={currentSubmenu?.label}
        headerActions={headerActions}
      />
      {list}
      <PageActionMenuFooter>{footer}</PageActionMenuFooter>
    </div>
  );
});

export const PageActionMenu = memo(function PageActionMenu({
  items: itemsProp,
  onRefresh: onRefreshProp,
  refreshBusy: refreshBusyProp,
  refreshLabel: refreshLabelProp = "Aggiorna",
  back: backProp,
  className = "",
  headerActions: headerActionsProp,
  menuAttention: menuAttentionProp,
}: PageActionMenuProps) {
  const ctx = usePageActionMenuContext();
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelContentRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const menuId = useId();

  const rbac = useRbac();
  const perms = usePermissionsSnapshot();

  const rawItems = itemsProp ?? ctx?.items ?? [];
  const onRefresh = onRefreshProp ?? ctx?.onRefresh;
  const refreshBusy = refreshBusyProp ?? ctx?.refreshBusy ?? false;
  const refreshLabel = refreshLabelProp ?? ctx?.refreshLabel ?? "Aggiorna";
  const back = backProp ?? ctx?.back ?? resolveMobilePageHeaderBack(pathname);

  const items = useMemo(
    () => filterPageActionItems(rawItems, { rbac, perms }),
    [rawItems, rbac, perms],
  );

  const showDot = useMemo(() => {
    if (menuAttentionProp !== undefined) return menuAttentionProp;
    if (ctx?.menuAttention) return true;
    return pageActionMenuHasAttention(items);
  }, [ctx?.menuAttention, items, menuAttentionProp]);

  const singletonItem = useMemo(() => getSingletonPageActionListItem(items), [items]);
  const refreshOnly = useMemo(
    () => isRefreshOnlyPageActionMenu(items, { onRefresh }),
    [items, onRefresh],
  );
  const useDropdownMenu = useMemo(
    () => shouldUsePageActionMenuDropdown(items, { onRefresh, backHref: back?.href }),
    [items, onRefresh, back?.href],
  );

  const hasMenuContent = useMemo(
    () => pageActionMenuHasContent(items, { onRefresh, backHref: back?.href }),
    [items, onRefresh, back?.href],
  );

  const openMenu = useCallback(() => {
    setOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setOpen((o) => !o);
  }, []);

  const { restoreFocus, captureFocus } = useDropdownFocusRestore(open);

  useEffect(() => {
    if (open) captureFocus();
    if (!open) restoreFocus();
  }, [open, captureFocus, restoreFocus]);

  const { style, floatingRef, placementOriginClass, scrollInside } = useGlobalDropdownPortal({
    open,
    anchorRef: triggerRef,
    contentRef: panelContentRef,
    placement: "bottom-end",
    matchAnchorWidth: false,
    panelWidth: PAGE_ACTION_MENU_PANEL_WIDTH,
    maxHeight: PAGE_ACTION_MENU_PANEL_MAX_HEIGHT,
    repositionDeps: [items.length, open],
  });

  useDropdownOutsideDismiss(open, triggerRef, panelContentRef, closeMenu);

  useEffect(() => {
    if (!hasMenuContent) closeMenu();
  }, [hasMenuContent, closeMenu]);

  useEffect(() => {
    if (!hasMenuContent || !useDropdownMenu) return;
    function onShortcut(e: KeyboardEvent) {
      if (!e.altKey || (e.key !== "a" && e.key !== "A")) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      if (open) closeMenu();
      else openMenu();
    }
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, [hasMenuContent, useDropdownMenu, open, closeMenu, openMenu]);

  if (!hasMenuContent) return null;

  if (!useDropdownMenu && refreshOnly && onRefresh) {
    return (
      <div className={`relative shrink-0${className ? ` ${className}` : ""}`}>
        <PageActionMenuRefreshButton
          busy={refreshBusy}
          label={refreshLabel}
          onClick={onRefresh}
        />
      </div>
    );
  }

  if (!useDropdownMenu && singletonItem) {
    return (
      <div className={`flex shrink-0 items-center gap-1${className ? ` ${className}` : ""}`}>
        {onRefresh ? (
          <PageActionMenuRefreshButton
            busy={refreshBusy}
            label={refreshLabel}
            onClick={onRefresh}
          />
        ) : null}
        <PageActionMenuDirectTrigger item={singletonItem} showDot={showDot} />
      </div>
    );
  }

  const panelProps: PanelProps = {
    items,
    open,
    onClose: closeMenu,
    onRefresh,
    refreshBusy,
    refreshLabel,
    back,
    headerActions: headerActionsProp,
  };

  const dropdownPanel =
    open && style ? (
      <div
        ref={(node) => {
          panelContentRef.current = node;
          floatingRef(node);
        }}
        style={style}
        id={menuId}
        role="presentation"
        className={`${pageActionMenuPanelClass} ${placementOriginClass} flex min-w-0 flex-col ${
          scrollInside ? pageActionMenuPortalScrollClass : "overflow-hidden"
        }`}
      >
        <PageActionMenuPanel {...panelProps} />
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${dsPageHeaderIconBtn} relative shrink-0${className ? ` ${className}` : ""}`}
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Azioni pagina"
        data-testid="page-action-menu-trigger"
      >
        <IconMoreVertical />
        {showDot ? (
          <span
            className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[color:var(--cab-primary)] ring-2 ring-[var(--cab-surface)]"
            aria-hidden
          />
        ) : null}
        <span className="sr-only">Azioni pagina</span>
      </button>

      {dropdownPanel && typeof document !== "undefined" ? createPortal(dropdownPanel, document.body) : null}
    </>
  );
});
