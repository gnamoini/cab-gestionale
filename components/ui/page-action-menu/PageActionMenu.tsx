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
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import { GestionaleMobileBottomSheet } from "@/components/gestionale/gestionale-mobile-bottom-sheet";
import { PageActionMenuDivider } from "@/components/ui/page-action-menu/PageActionMenuDivider";
import { PageActionMenuFooter } from "@/components/ui/page-action-menu/PageActionMenuFooter";
import { PageActionMenuHeader } from "@/components/ui/page-action-menu/PageActionMenuHeader";
import { PageActionMenuItem } from "@/components/ui/page-action-menu/PageActionMenuItem";
import { filterPageActionItems } from "@/components/ui/page-action-menu/page-action-menu-permissions";
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
  PAGE_ACTION_MENU_PANEL_WIDTH,
  pageActionMenuPanelClass,
} from "@/lib/ui/page-action-menu-tokens";
import { dsPageToolbarIconBtn } from "@/lib/ui/design-system";
import { useDropdownFocusRestore } from "@/lib/ui/use-dropdown-focus-restore";
import { useDialogFocusTrap } from "@/lib/ui/use-dialog-focus-trap";
import { useSmUp } from "@/lib/ui/use-sm-up";

function IconMoreVertical({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

type PanelProps = {
  items: PageActionItem[];
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  refreshBusy?: boolean;
  refreshLabel?: string;
  back?: { href: string; label: string } | null;
  footer?: ReactNode;
  variant: "desktop" | "mobile";
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
  variant,
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
    open: open && variant === "desktop",
    containerRef: panelRef,
    onClose,
    activeIndex,
    setActiveIndex,
  });

  useDialogFocusTrap(panelRef, open && variant === "desktop");

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
    <ul id={listId} role="menu" className="m-0 list-none p-1 gestionale-scrollbar" aria-label="Azioni pagina">
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

  const body = (
    <>
      <PageActionMenuHeader
        back={currentSubmenu ? null : back}
        onRefresh={currentSubmenu ? undefined : onRefresh}
        refreshBusy={refreshBusy}
        refreshLabel={refreshLabel}
        onSubmenuBack={currentSubmenu ? handleSubmenuBack : undefined}
        submenuTitle={currentSubmenu?.label}
      />
      <div className="max-h-[min(70dvh,28rem)] overflow-y-auto gestionale-scrollbar">{list}</div>
      <PageActionMenuFooter>{footer}</PageActionMenuFooter>
    </>
  );

  if (variant === "mobile") {
    return (
      <GestionaleMobileBottomSheet
        open={open}
        onRequestClose={onClose}
        title={currentSubmenu?.label ?? "Azioni"}
        titleId={`${listId}-title`}
        restoreFocusRef={panelRef}
      >
        {body}
      </GestionaleMobileBottomSheet>
    );
  }

  if (!open) return null;

  return (
    <div ref={panelRef} className="flex max-h-[min(80dvh,32rem)] min-w-0 flex-col overflow-hidden">
      {body}
    </div>
  );
});

export const PageActionMenu = memo(function PageActionMenu({
  items: itemsProp,
  onRefresh: onRefreshProp,
  refreshBusy: refreshBusyProp,
  refreshLabel: refreshLabelProp = "Aggiorna",
  back: backProp,
  filtersActive: filtersActiveProp,
  showFiltersActiveDot,
  className = "",
}: PageActionMenuProps) {
  const ctx = usePageActionMenuContext();
  const pathname = usePathname();
  const smUp = useSmUp();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelContentRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const menuId = useId();

  const rbac = useRbac();
  const perms = usePermissionsSnapshot();

  const rawItems = itemsProp ?? ctx?.items ?? [];
  const onRefresh = onRefreshProp ?? ctx?.onRefresh;
  const refreshBusy = refreshBusyProp ?? ctx?.refreshBusy ?? false;
  const refreshLabel = refreshLabelProp ?? ctx?.refreshLabel ?? "Aggiorna";
  const back = backProp ?? ctx?.back ?? resolveMobilePageHeaderBack(pathname);
  const filtersActive = filtersActiveProp ?? ctx?.filtersActive ?? false;
  const showDot = showFiltersActiveDot ?? filtersActive;

  const items = useMemo(
    () => filterPageActionItems(rawItems, { rbac, perms }),
    [rawItems, rbac, perms],
  );

  const openMenu = useCallback(() => {
    setHasOpened(true);
    setOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setOpen((o) => {
      if (!o) setHasOpened(true);
      return !o;
    });
  }, []);

  const { restoreFocus, captureFocus } = useDropdownFocusRestore(open);

  useEffect(() => {
    if (open) captureFocus();
    if (!open) restoreFocus();
  }, [open, captureFocus, restoreFocus]);

  const { style, floatingRef, placementOriginClass, scrollInside } = useGlobalDropdownPortal({
    open: open && smUp,
    anchorRef: triggerRef,
    contentRef: panelContentRef,
    placement: "bottom-end",
    matchAnchorWidth: false,
    panelWidth: PAGE_ACTION_MENU_PANEL_WIDTH,
    maxHeight: 480,
    repositionDeps: [items.length, open],
  });

  useDropdownOutsideDismiss(open && smUp, triggerRef, panelContentRef, closeMenu);

  useEffect(() => {
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
  }, [open, closeMenu, openMenu]);

  const panelProps: PanelProps = {
    items,
    open: open && hasOpened,
    onClose: closeMenu,
    onRefresh,
    refreshBusy,
    refreshLabel,
    back,
    variant: smUp ? "desktop" : "mobile",
  };

  const desktopPanel =
    open && smUp && style ? (
      <div
        ref={(node) => {
          panelContentRef.current = node;
          floatingRef(node);
        }}
        style={style}
        id={menuId}
        role="presentation"
        className={`${pageActionMenuPanelClass} ${placementOriginClass} flex min-w-0 flex-col ${
          scrollInside ? "overflow-y-auto gestionale-scrollbar" : "overflow-hidden"
        }`}
      >
        <PageActionMenuPanel {...panelProps} variant="desktop" />
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${dsPageToolbarIconBtn} relative shrink-0${className ? ` ${className}` : ""}`}
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

      {!smUp && hasOpened ? <PageActionMenuPanel {...panelProps} variant="mobile" /> : null}

      {desktopPanel && typeof document !== "undefined" ? createPortal(desktopPanel, document.body) : null}
    </>
  );
});
