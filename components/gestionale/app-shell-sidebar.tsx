"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type CSSProperties, type FocusEvent, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import { CloseButton } from "@/components/design-system";
import { erpFocus } from "@/lib/ui/erp-tokens";
import type { GestionaleNavResolvedItem } from "@/components/gestionale/gestionale-nav-config";
import { CAB_APP_PRODUCT_NAME, CabLogo } from "@/components/gestionale/cab-logo";
import { SidebarSessionPanel } from "@/components/gestionale/sidebar-session-panel";
import { SidebarNavRow } from "@/components/gestionale/sidebar-nav-row";
import { SidebarNavSkeleton } from "@/components/gestionale/sidebar-nav-skeleton";
import {
  sidebarAsideWidthCollapsedClass,
  sidebarAsideWidthExpandedClass,
  sidebarNavCountBadgeClass,
} from "@/lib/ui/sidebar-layout";
import { resolveDrawerAsideClasses } from "@/lib/ui/modal-max-width-class";
import { dsZModalHigh } from "@/lib/ui/design-system";
import {
  isNavTargetCurrent,
  isSidebarNavLinkCurrent,
  scheduleRouteTransitionBegin,
} from "@/src/lib/navigation/route-transition";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
import { useSwipeToDismiss } from "@/lib/ui/use-swipe-to-dismiss";
import { useOverlayBackHandler } from "@/lib/ui/use-overlay-back-handler";
import { useDialogFocusTrap } from "@/lib/ui/use-dialog-focus-trap";
import { useDropdownFocusRestore } from "@/lib/ui/use-dropdown-focus-restore";
import { useMobileNavShell } from "@/context/mobile-nav-shell-context";
import { recordHealthMetric } from "@/lib/observability/runtime-health";

const shellTopBarClass =
  "flex h-14 shrink-0 items-center border-b border-[color:var(--cab-border)]";

const NAV_DRAWER_MS = 240;

function navDrawerAnimMs(): number {
  if (typeof window === "undefined") return NAV_DRAWER_MS;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : NAV_DRAWER_MS;
}

function NavLink({
  href,
  label,
  Icon,
  collapsed,
  disabled,
  badge,
  activePath,
  onNavigate,
  onExpandIntent,
  onActiveNavClick,
}: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  collapsed: boolean;
  disabled?: boolean;
  badge?: string | null;
  activePath: string;
  onNavigate?: (href: string) => void;
  onExpandIntent?: () => void;
  onActiveNavClick?: () => void;
}) {
  const active = isNavTargetCurrent(activePath, href);

  const navPointerIntentProps = collapsed && !active
    ? {
        onPointerEnter: () => onExpandIntent?.(),
        onFocus: () => onExpandIntent?.(),
      }
    : {};

  const suppressActiveRailFocus = collapsed && active && !disabled;

  const trailing = badge ? (
    <span className={`${sidebarNavCountBadgeClass}`}>{badge}</span>
  ) : undefined;

  const icon = <Icon className="h-4 w-4" />;

  if (disabled) {
    return (
      <SidebarNavRow
        as="div"
        disabled
        active={active}
        collapsed={collapsed}
        icon={icon}
        label={label}
        trailing={trailing}
        railTooltip={badge ? "Non disponibile" : label}
        {...navPointerIntentProps}
      />
    );
  }

  return (
    <SidebarNavRow
      as="link"
      href={href}
      active={active}
      collapsed={collapsed}
      icon={icon}
      label={label}
      trailing={trailing}
      railTooltip={label}
      onMouseDown={(e: ReactMouseEvent<HTMLAnchorElement>) => {
        if (suppressActiveRailFocus) e.preventDefault();
      }}
      onClick={(e: ReactMouseEvent<HTMLAnchorElement>) => {
        if (isNavTargetCurrent(activePath, href)) {
          e.preventDefault();
          onActiveNavClick?.();
          return;
        }
        scheduleRouteTransitionBegin(e, () => onNavigate?.(href));
      }}
      {...navPointerIntentProps}
    />
  );
}

/** Nav shell — `activePath` da unico `usePathname` nel parent sidebar. */
export function AppShellNav({
  navItems,
  collapsed,
  isNavLoading,
  activePath,
  onNavigate,
  onExpandIntent,
  onActiveNavClick,
}: {
  navItems: GestionaleNavResolvedItem[];
  collapsed: boolean;
  isNavLoading: boolean;
  activePath: string;
  onNavigate?: (href: string) => void;
  onExpandIntent?: () => void;
  onActiveNavClick?: () => void;
}) {
  if (isNavLoading) return <SidebarNavSkeleton />;

  return (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          Icon={item.Icon as ComponentType<{ className?: string }>}
          collapsed={collapsed}
          disabled={item.disabled}
          badge={item.badge}
          activePath={activePath}
          onNavigate={onNavigate}
          onExpandIntent={onExpandIntent}
          onActiveNavClick={onActiveNavClick}
        />
      ))}
    </>
  );
}

function MobileNavDrawer({
  open,
  edgeOpening,
  edgePanelProps,
  edgeBackdropProps,
  edgePanelRef,
  onClose,
  navItems,
  onNavigate,
  isCompactShell,
  isNavLoading,
  activePath,
}: {
  open: boolean;
  edgeOpening: boolean;
  edgePanelProps?: { style?: CSSProperties; className?: string };
  edgeBackdropProps?: { style?: CSSProperties; className?: string };
  edgePanelRef?: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  navItems: GestionaleNavResolvedItem[];
  onNavigate?: (href: string) => void;
  isCompactShell: boolean;
  isNavLoading: boolean;
  activePath: string;
}) {
  const mobileNav = useMobileNavShell();
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [edgeSettledOpen, setEdgeSettledOpen] = useState(false);
  const wasCommittedRef = useRef(false);
  const prevEdgeOpeningRef = useRef(false);
  const panelState = closing ? "closing" : "open";
  const drawerVisible = open || edgeOpening;
  const committed = open && !edgeOpening;
  const isActive = mounted && committed && !closing;
  const panelContainerRef = useRef<HTMLDivElement | null>(null);
  const { restoreFocus } = useDropdownFocusRestore(isActive);

  useEffect(() => {
    if (open) wasCommittedRef.current = true;
  }, [open]);

  useEffect(() => {
    const wasEdge = prevEdgeOpeningRef.current;
    prevEdgeOpeningRef.current = edgeOpening;
    if (wasEdge && !edgeOpening && open) {
      setEdgeSettledOpen(true);
    }
    if (!open) {
      setEdgeSettledOpen(false);
    }
  }, [edgeOpening, open]);

  useEffect(() => {
    if (drawerVisible) {
      setMounted(true);
      setClosing(false);
    }
  }, [drawerVisible]);

  useBodyScrollLock(mounted, "MobileNavDrawer");
  const swipeDismiss = useSwipeToDismiss(onClose, isActive);
  const swipeDismissedRef = swipeDismiss.swipeDismissedRef;

  useDialogFocusTrap(panelContainerRef, isActive);

  useLayoutEffect(() => {
    const node = panelContainerRef.current;
    if (edgeOpening && edgePanelRef) {
      edgePanelRef.current = node;
      return;
    }
    swipeDismiss.panelRef.current = node;
  }, [edgeOpening, edgePanelRef, mounted, swipeDismiss.panelRef]);

  useEffect(() => {
    if (!mounted || drawerVisible) return;
    if (!wasCommittedRef.current) {
      setMounted(false);
      setClosing(false);
      return;
    }
    wasCommittedRef.current = false;
    if (swipeDismissedRef.current) {
      swipeDismissedRef.current = false;
      setMounted(false);
      setClosing(false);
      restoreFocus();
      const trigger = mobileNav?.getMobileNavTrigger();
      if (trigger && document.contains(trigger)) {
        try {
          trigger.focus({ preventScroll: true });
        } catch {
          /* non focusable */
        }
      }
      return;
    }
    setClosing(true);
    const id = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
      restoreFocus();
      const trigger = mobileNav?.getMobileNavTrigger();
      if (trigger && document.contains(trigger)) {
        try {
          trigger.focus({ preventScroll: true });
        } catch {
          /* non focusable */
        }
      }
    }, navDrawerAnimMs());
    return () => window.clearTimeout(id);
  }, [drawerVisible, mobileNav, mounted, restoreFocus, swipeDismissedRef]);

  useOverlayBackHandler(isActive, onClose, "MobileNavDrawer");

  useEffect(() => {
    if (isCompactShell) return;
    setClosing(false);
    setMounted(false);
    onClose();
  }, [isCompactShell, onClose]);

  useEffect(() => {
    if (!isActive) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      }
      onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isActive, onClose]);

  if (!mounted || !isCompactShell) return null;

  const panelStyle = edgeOpening ? edgePanelProps?.style : swipeDismiss.panelProps.style;
  const panelClassExtra = edgeOpening
    ? edgePanelProps?.className
    : swipeDismiss.panelProps.className;
  const settledOpenClass = edgeSettledOpen ? "cab-nav-drawer-open-settled" : "";
  const backdropStyle = edgeOpening ? edgeBackdropProps?.style : swipeDismiss.backdropProps.style;
  const backdropClassExtra = edgeOpening
    ? edgeBackdropProps?.className
    : swipeDismiss.backdropProps.className;

  return (
    <div className={`fixed inset-0 ${dsZModalHigh} overscroll-none`} role="presentation">
      <button
        type="button"
        className={`cab-nav-drawer-backdrop absolute inset-0 touch-none bg-black/50 backdrop-blur-[1px] touch-manipulation${backdropClassExtra ? ` ${backdropClassExtra}` : ""}${edgeSettledOpen ? " cab-nav-drawer-open-settled-backdrop" : ""}`}
        data-state={panelState}
        style={backdropStyle}
        aria-label="Chiudi menu"
        onClick={committed ? onClose : undefined}
        tabIndex={committed ? 0 : -1}
      />
      <div
        ref={panelContainerRef}
        className={`cab-nav-drawer-panel cab-sidebar ${resolveDrawerAsideClasses("drawerNav")}${panelClassExtra ? ` ${panelClassExtra}` : ""}${settledOpenClass ? ` ${settledOpenClass}` : ""}`}
        data-state={panelState}
        role="dialog"
        aria-modal="true"
        aria-label="Menu principale"
        style={panelStyle}
        onTouchStart={committed ? swipeDismiss.panelProps.onTouchStart : undefined}
        onTouchMove={committed ? swipeDismiss.panelProps.onTouchMove : undefined}
        onTouchEnd={committed ? swipeDismiss.panelProps.onTouchEnd : undefined}
        onTouchCancel={committed ? swipeDismiss.panelProps.onTouchCancel : undefined}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={`${shellTopBarClass} shrink-0 grid grid-cols-[1fr_auto_1fr] items-center px-4`}>
          <span className="min-w-0" aria-hidden />
          <CabLogo height={32} className="shrink-0" sizes="112px" priority />
          <div className="flex min-w-0 items-center justify-end">
            <CloseButton onClick={onClose} />
          </div>
        </div>
        <SidebarSessionPanel variant="drawer" placement="brand" />
        <nav
          className="cab-sidebar-nav gestionale-scrollbar flex min-h-0 min-w-0 flex-1 flex-col p-3 pb-0"
          aria-label="Sezioni principali"
        >
          <div className="gestionale-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
            <AppShellNav
              navItems={navItems}
              collapsed={false}
              isNavLoading={isNavLoading}
              activePath={activePath}
              onActiveNavClick={onClose}
              onNavigate={(href) => {
                onNavigate?.(href);
                onClose();
              }}
            />
          </div>
        </nav>
      </div>
    </div>
  );
}

export type AppShellSidebarProps = {
  homePath: string;
  navItems: GestionaleNavResolvedItem[];
  isNavLoading: boolean;
  isCompactShell: boolean;
  collapsed: boolean;
  sidebarExpanded: boolean;
  asideRef: RefObject<HTMLElement | null>;
  onSidebarMouseEnter: () => void;
  onSidebarMouseLeave: () => void;
  onSidebarFocusCapture: () => void;
  onSidebarBlurCapture: (event: FocusEvent<HTMLElement>) => void;
  onSidebarNavIntent: () => void;
  collapseSidebar: () => void;
  beginRouteTransition: (href: string) => void;
  routeTransitionStartRef: RefObject<number | null>;
  routePathnameRef: RefObject<string>;
  mobileOpen: boolean;
  edgeOpening: boolean;
  edgeSwipePanelProps?: { style?: CSSProperties; className?: string };
  edgeSwipeBackdropProps?: { style?: CSSProperties; className?: string };
  edgeSwipePanelRef?: RefObject<HTMLDivElement | null>;
  closeMobileNav: () => void;
};

function AppShellSidebarInner({
  homePath,
  navItems,
  isNavLoading,
  isCompactShell,
  collapsed,
  sidebarExpanded,
  asideRef,
  onSidebarMouseEnter,
  onSidebarMouseLeave,
  onSidebarFocusCapture,
  onSidebarBlurCapture,
  onSidebarNavIntent,
  collapseSidebar,
  beginRouteTransition,
  routeTransitionStartRef,
  routePathnameRef,
  mobileOpen,
  edgeOpening,
  edgeSwipePanelProps,
  edgeSwipeBackdropProps,
  edgeSwipePanelRef,
  closeMobileNav,
}: AppShellSidebarProps) {
  const activePath = usePathname();
  routePathnameRef.current = activePath;

  useEffect(() => {
    if (routeTransitionStartRef.current != null) {
      const durationMs = Math.round(performance.now() - routeTransitionStartRef.current);
      recordHealthMetric("routeTransitionMs", durationMs);
      routeTransitionStartRef.current = null;
    }
    closeMobileNav();
    collapseSidebar();
  }, [activePath, closeMobileNav, collapseSidebar, routeTransitionStartRef]);

  const onHeaderHomeClick = useCallback(
    (e: ReactMouseEvent<HTMLAnchorElement>) => {
      if (activePath === homePath) {
        e.preventDefault();
        collapseSidebar();
        (e.currentTarget as HTMLElement).blur();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      scheduleRouteTransitionBegin(e, () => beginRouteTransition(homePath));
    },
    [activePath, beginRouteTransition, collapseSidebar, homePath],
  );

  const asideWidthClass = sidebarExpanded ? sidebarAsideWidthExpandedClass : sidebarAsideWidthCollapsedClass;
  const asideW = sidebarExpanded ? `${asideWidthClass} z-50` : asideWidthClass;
  const sidebarTopOffset =
    "top-0 supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]";

  return (
    <>
      <aside
        ref={asideRef}
        data-sidebar-collapsed={collapsed ? "" : undefined}
        data-sidebar-hover-expanded={sidebarExpanded ? "" : undefined}
        onMouseEnter={onSidebarMouseEnter}
        onMouseLeave={onSidebarMouseLeave}
        onFocusCapture={(event) => {
          if (isSidebarNavLinkCurrent(event.target, activePath)) return;
          onSidebarFocusCapture();
        }}
        onBlurCapture={onSidebarBlurCapture}
        className={`cab-sidebar fixed bottom-0 left-0 z-40 flex-col overflow-x-hidden border-r border-[color:var(--cab-border)] bg-[var(--cab-card)] transition-[width,box-shadow] duration-[var(--cab-sidebar-width-motion)] ease-[var(--cab-sidebar-ease-out)] ${sidebarTopOffset} ${
          isCompactShell ? "hidden" : `flex ${asideW}`
        }`}
      >
        <div className="cab-sidebar-brand shrink-0">
          <Link
            href={homePath}
            onClick={onHeaderHomeClick}
            aria-label={CAB_APP_PRODUCT_NAME}
            className={`${erpFocus} cab-sidebar-brand-link transition-opacity duration-200 hover:opacity-90`}
          >
            <CabLogo className="cab-sidebar-brand-logo" sizes="119px" priority />
          </Link>
        </div>
        {!isCompactShell ? (
          <SidebarSessionPanel
            variant="sidebar"
            placement="brand"
            sidebarCollapsed={collapsed && !sidebarExpanded}
            onSidebarExpandIntent={onSidebarNavIntent}
            onOpenInbox={collapseSidebar}
          />
        ) : null}
        <nav
          className="cab-sidebar-nav gestionale-scrollbar flex min-h-0 min-w-0 flex-1 flex-col p-3 pb-0"
          aria-label="Sezioni principali"
          onPointerEnter={(event) => {
            if (!collapsed) return;
            if (isSidebarNavLinkCurrent(event.target, activePath)) return;
            if (event.target instanceof Element && event.target.closest(".cab-sidebar-nav-row")) {
              onSidebarNavIntent();
            }
          }}
        >
          <div className="gestionale-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch]">
            <AppShellNav
              navItems={navItems}
              collapsed={collapsed}
              isNavLoading={isNavLoading}
              activePath={activePath}
              onNavigate={beginRouteTransition}
              onExpandIntent={onSidebarNavIntent}
              onActiveNavClick={() => {
                if (sidebarExpanded) collapseSidebar();
              }}
            />
          </div>
        </nav>
      </aside>

      <MobileNavDrawer
        open={mobileOpen}
        edgeOpening={edgeOpening}
        edgePanelProps={edgeSwipePanelProps}
        edgeBackdropProps={edgeSwipeBackdropProps}
        edgePanelRef={edgeSwipePanelRef}
        onClose={closeMobileNav}
        navItems={navItems}
        onNavigate={beginRouteTransition}
        isCompactShell={isCompactShell}
        isNavLoading={isNavLoading}
        activePath={activePath}
      />
    </>
  );
}

export const AppShellSidebar = memo(AppShellSidebarInner);

export { MobileNavDrawer };
