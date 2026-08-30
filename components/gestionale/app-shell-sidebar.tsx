"use client";

/* eslint-disable react-hooks/refs -- lint phase2: intentional ref wiring for stable callbacks/DOM sync */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";
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
import { isGestionaleDrawerElement } from "@/lib/ui/use-sidebar-collapsed";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
import { OverlayLayerPriority } from "@/lib/ui/overlay-back-stack";
import { useOverlayBackHandler } from "@/lib/ui/use-overlay-back-handler";
import { useDialogFocusTrap } from "@/lib/ui/use-dialog-focus-trap";
import { useDropdownFocusRestore } from "@/lib/ui/use-dropdown-focus-restore";
import { useMobileNavShell } from "@/context/mobile-nav-shell-context";
import { recordHealthMetric } from "@/lib/observability/runtime-health";
import {
  NAV_DRAWER_PANEL_ID,
  navDrawerAnimMs,
} from "@/lib/ui/mobile-nav-drawer-contract";
import type { useNavDrawerMachine } from "@/lib/ui/mobile-nav-drawer-machine";

const shellTopBarClass =
  "flex min-h-16 shrink-0 items-center border-b border-[color:var(--cab-border)] py-3 pt-[max(0.75rem,env(safe-area-inset-top))]";

type DrawerController = ReturnType<typeof useNavDrawerMachine>;

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
  drawer,
  navGesturePanelProps,
  navGestureBackdropProps,
  navGesturePanelRef,
  navGestureBackdropRef,
  edgeSnapVisuallyClosed,
  dismissVisuallyClosed,
  onEdgeSnapConsumed,
  onDismissSnapConsumed,
  navGestureResetDrag,
  onClose,
  navItems,
  onNavigate,
  isCompactShell,
  isNavLoading,
  activePath,
}: {
  drawer: DrawerController;
  navGesturePanelProps?: { style?: CSSProperties; className?: string };
  navGestureBackdropProps?: { style?: CSSProperties; className?: string };
  navGesturePanelRef?: RefObject<HTMLDivElement | null>;
  navGestureBackdropRef?: RefObject<HTMLElement | null>;
  edgeSnapVisuallyClosed?: boolean;
  dismissVisuallyClosed?: boolean;
  onEdgeSnapConsumed?: () => void;
  onDismissSnapConsumed?: () => void;
  navGestureResetDrag?: () => void;
  onClose: () => void;
  navItems: GestionaleNavResolvedItem[];
  onNavigate?: (href: string) => void;
  isCompactShell: boolean;
  isNavLoading: boolean;
  activePath: string;
}) {
  const { flags, onAnimationEnd, close, forceClose } = drawer;
  const mobileNav = useMobileNavShell();
  const panelContainerRef = useRef<HTMLDivElement | null>(null);
  const backdropButtonRef = useRef<HTMLButtonElement | null>(null);
  const announceRef = useRef<HTMLDivElement | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const skipCssCloseAnim = dismissVisuallyClosed === true || edgeSnapVisuallyClosed === true;
  const panelState = flags.closing && !skipCssCloseAnim ? "closing" : "open";
  const edgeOpening = flags.edgePreview;
  const backHandlerActive = flags.mounted && flags.state !== "CLOSED";
  const focusTrapActive = flags.isActive;

  const { restoreFocus } = useDropdownFocusRestore(focusTrapActive);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    if (flags.state === "OPEN") setAnnouncement("Menu principale aperto");
    if (!flags.mounted && flags.state === "CLOSED") setAnnouncement("Menu principale chiuso");
  }, [flags.mounted, flags.state]);

  useBodyScrollLock(flags.mounted, "MobileNavDrawer");

  useDialogFocusTrap(panelContainerRef, focusTrapActive);
  useOverlayBackHandler(backHandlerActive, onClose, "MobileNavDrawer", {
    layer: "navigation",
    priority: OverlayLayerPriority.navigation,
  });

  useLayoutEffect(() => {
    const node = panelContainerRef.current;
    if (navGesturePanelRef) navGesturePanelRef.current = node;
    if (navGestureBackdropRef && backdropButtonRef.current) {
      navGestureBackdropRef.current = backdropButtonRef.current;
    }
  }, [navGestureBackdropRef, navGesturePanelRef, flags.mounted]);

  useEffect(() => {
    const needsCloseAnim =
      flags.mounted && (flags.closing || flags.state === "LOCKED");
    if (!needsCloseAnim) return;

    const finishClose = () => {
      navGestureResetDrag?.();
      onAnimationEnd();
      onEdgeSnapConsumed?.();
      onDismissSnapConsumed?.();
      restoreFocus();
      const trigger = mobileNav?.getMobileNavTrigger();
      if (trigger && document.contains(trigger)) {
        try {
          trigger.focus({ preventScroll: true });
        } catch {
          /* non focusable */
        }
      }
    };

    if (skipCssCloseAnim) {
      finishClose();
      return;
    }

    const ms = navDrawerAnimMs(
      typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    const id = window.setTimeout(finishClose, ms);
    return () => window.clearTimeout(id);
  }, [
    flags.closing,
    flags.mounted,
    flags.state,
    mobileNav,
    navGestureResetDrag,
    onAnimationEnd,
    onDismissSnapConsumed,
    onEdgeSnapConsumed,
    restoreFocus,
    skipCssCloseAnim,
  ]);

  useEffect(() => {
    if (flags.state === "SETTLING_OPEN" || flags.state === "OPENING") {
      const ms = navDrawerAnimMs(
        typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      const id = window.setTimeout(() => onAnimationEnd(), ms);
      return () => window.clearTimeout(id);
    }
  }, [flags.state, onAnimationEnd]);

  useEffect(() => {
    if (!isCompactShell) {
      forceClose();
    }
  }, [forceClose, isCompactShell]);

  useEffect(() => {
    if (!focusTrapActive) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      }
      close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close, focusTrapActive]);

  if (!flags.mounted || !isCompactShell) return null;

  const panelClassExtra = navGesturePanelProps?.className;
  const settledOpenClass = flags.edgeSettledOpen ? "cab-nav-drawer-open-settled" : "";
  const lockedClass = flags.isLocked ? "cab-nav-drawer-locked" : "";
  const backdropClassExtra = navGestureBackdropProps?.className;
  const canBackdropClose =
    flags.state === "OPEN" || (flags.state === "DRAGGING" && edgeOpening);

  const handleBackdropClick = () => {
    if (!canBackdropClose) return;
    close();
  };

  return (
    <div
      className={`fixed inset-x-0 top-[var(--cab-vv-offset-top,0px)] flex h-[var(--cab-vv-height,100dvh)] max-h-[var(--cab-vv-height,100dvh)] w-full ${dsZModalHigh} overscroll-none${lockedClass ? ` ${lockedClass}` : ""}`}
      role="presentation"
    >
      <div
        ref={announceRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      <button
        ref={backdropButtonRef}
        type="button"
        className={`cab-nav-drawer-backdrop absolute inset-0 touch-none bg-black/50 backdrop-blur-[1px] touch-manipulation${backdropClassExtra ? ` ${backdropClassExtra}` : ""}${flags.edgeSettledOpen ? " cab-nav-drawer-open-settled-backdrop" : ""}`}
        data-state={panelState}
        style={navGestureBackdropProps?.style}
        aria-label="Chiudi menu"
        onClick={canBackdropClose ? handleBackdropClick : undefined}
        tabIndex={canBackdropClose ? 0 : -1}
      />
      <div
        ref={panelContainerRef}
        id={NAV_DRAWER_PANEL_ID}
        className={`cab-nav-drawer-panel cab-sidebar ${resolveDrawerAsideClasses("drawerNav")}${panelClassExtra ? ` ${panelClassExtra}` : ""}${settledOpenClass ? ` ${settledOpenClass}` : ""}`}
        data-state={panelState}
        role="dialog"
        aria-modal="true"
        aria-label="Menu principale"
        style={navGesturePanelProps?.style}
        onAnimationEnd={(e) => {
          if (e.target !== e.currentTarget) return;
          if (flags.state === "OPENING" || flags.state === "SETTLING_OPEN") onAnimationEnd();
        }}
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
          <div className="gestionale-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden overscroll-contain border-b border-[color:var(--cab-border)] touch-pan-y [-webkit-overflow-scrolling:touch]">
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
  drawer: DrawerController;
  navGesturePanelProps?: { style?: CSSProperties; className?: string };
  navGestureBackdropProps?: { style?: CSSProperties; className?: string };
  navGesturePanelRef?: RefObject<HTMLDivElement | null>;
  navGestureBackdropRef?: RefObject<HTMLElement | null>;
  edgeSnapVisuallyClosed?: boolean;
  dismissVisuallyClosed?: boolean;
  onEdgeSnapConsumed?: () => void;
  onDismissSnapConsumed?: () => void;
  navGestureResetDrag?: () => void;
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
  drawer,
  navGesturePanelProps,
  navGestureBackdropProps,
  navGesturePanelRef,
  navGestureBackdropRef,
  edgeSnapVisuallyClosed,
  dismissVisuallyClosed,
  onEdgeSnapConsumed,
  onDismissSnapConsumed,
  navGestureResetDrag,
}: AppShellSidebarProps) {
  const activePath = usePathname();
  const { routeLock } = drawer;
  routePathnameRef.current = activePath;

  useEffect(() => {
    if (routeTransitionStartRef.current != null) {
      const durationMs = Math.round(performance.now() - routeTransitionStartRef.current);
      recordHealthMetric("routeTransitionMs", durationMs);
      routeTransitionStartRef.current = null;
    }
    routeLock();
    collapseSidebar();
  }, [activePath, collapseSidebar, routeLock, routeTransitionStartRef]);

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
          if (isGestionaleDrawerElement(event.target)) return;
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
        drawer={drawer}
        navGesturePanelProps={navGesturePanelProps}
        navGestureBackdropProps={navGestureBackdropProps}
        navGesturePanelRef={navGesturePanelRef}
        navGestureBackdropRef={navGestureBackdropRef}
        edgeSnapVisuallyClosed={edgeSnapVisuallyClosed}
        dismissVisuallyClosed={dismissVisuallyClosed}
        onEdgeSnapConsumed={onEdgeSnapConsumed}
        onDismissSnapConsumed={onDismissSnapConsumed}
        navGestureResetDrag={navGestureResetDrag}
        onClose={drawer.close}
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
