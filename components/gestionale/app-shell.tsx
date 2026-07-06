"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { CloseButton } from "@/components/design-system";
import { useAuth } from "@/context/auth-context";
import { erpFocus } from "@/lib/ui/erp-tokens";
import { buildGestionaleNav, type GestionaleNavResolvedItem } from "@/components/gestionale/gestionale-nav-config";
import { CLIENTE_HOME_PATH, isClienteRole } from "@/lib/auth/rbac";
import { useRbac } from "@/src/hooks/use-rbac";
import { useRbacNavAccess } from "@/src/hooks/use-rbac-nav-access";
import { SidebarNavSkeleton } from "@/components/gestionale/sidebar-nav-skeleton";
import { CabLogo, CAB_APP_PRODUCT_NAME } from "@/components/gestionale/cab-logo";
import { SidebarSessionPanel } from "@/components/gestionale/sidebar-session-panel";
import { SidebarNavRow } from "@/components/gestionale/sidebar-nav-row";
import {
  sidebarAsideWidthCollapsedClass,
  sidebarAsideWidthExpandedClass,
  sidebarNavCountBadgeClass,
} from "@/lib/ui/sidebar-layout";
import { ProfileSheetProvider } from "@/components/profile/profile-sheet-context";
import {
  dsGestionaleContentMax,
  dsGestionaleContentRail,
  dsZModalHigh,
} from "@/lib/ui/design-system";
import { layoutPageRoot, layoutResponsiveCoreScope } from "@/lib/ui/responsive-layout-core";
import { gestionaleShellContentGutterClass } from "@/lib/ui/gestionale-shell-layout";
import { useGestionaleShellLayoutSync } from "@/lib/ui/use-gestionale-shell-layout-sync";
import { useSwipeToDismiss } from "@/lib/ui/use-swipe-to-dismiss";
import { GestionaleShellLayoutProvider } from "@/context/gestionale-shell-layout-context";
import { MobileNavShellProvider } from "@/context/mobile-nav-shell-context";
import dynamic from "next/dynamic";

const DevAuditMounts = dynamic(
  () => import("@/components/gestionale/dev-audit-mounts").then((m) => m.DevAuditMounts),
  { ssr: false },
);
const ReactRenderAuditProfiler = dynamic(
  () =>
    import("@/components/gestionale/react-render-audit-profiler").then((m) => m.ReactRenderAuditProfiler),
  { ssr: false },
);
import {
  isNavTargetCurrent,
  isSidebarNavLinkCurrent,
  scheduleRouteTransitionBegin,
} from "@/src/lib/navigation/route-transition";
import { useGestionaleMainScrollLock } from "@/lib/ui/use-body-scroll-lock";
import { useGestionaleScrollEnd } from "@/lib/ui/use-gestionale-scroll-end";
import { dsGestionaleScrollEndPadFade } from "@/lib/ui/scroll-system";
import { useOverlayBackHandler } from "@/lib/ui/use-overlay-back-handler";
import { healBodyScrollLockState } from "@/lib/ui/body-scroll-lock-manager";
import { cabAppViewportFillClass } from "@/lib/ui/viewport-fill-sync";
import { useSidebarHoverExpand } from "@/lib/ui/use-sidebar-collapsed";
import { recordHealthMetric } from "@/lib/observability/runtime-health";
import { useBootInvestigationMount } from "@/lib/observability/use-boot-investigation-mount";
import { resolveDrawerAsideClasses } from "@/lib/ui/modal-max-width-class";

const shellTopBarClass =
  "flex h-14 shrink-0 items-center border-b border-[color:var(--cab-border)]";

function NavLink({
  href,
  label,
  Icon,
  collapsed,
  disabled,
  badge,
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
  onNavigate?: (href: string) => void;
  onExpandIntent?: () => void;
  onActiveNavClick?: () => void;
}) {
  const pathname = usePathname();
  const active = isNavTargetCurrent(pathname, href);

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

  const sharedProps = {
    active,
    collapsed,
    icon: <Icon className="h-4 w-4" />,
    label,
    trailing,
    ...navPointerIntentProps,
  };

  const row = disabled ? (
    <SidebarNavRow
      as="div"
      disabled
      active={active}
      collapsed={collapsed}
      icon={sharedProps.icon}
      label={label}
      trailing={trailing}
      railTooltip={badge ? "Non disponibile" : label}
      {...navPointerIntentProps}
    />
  ) : (
    <SidebarNavRow
      as="link"
      href={href}
      active={active}
      collapsed={collapsed}
      icon={sharedProps.icon}
      label={label}
      trailing={trailing}
      railTooltip={label}
      onMouseDown={(e: ReactMouseEvent<HTMLAnchorElement>) => {
        if (suppressActiveRailFocus) e.preventDefault();
      }}
      onClick={(e: ReactMouseEvent<HTMLAnchorElement>) => {
        if (isNavTargetCurrent(pathname, href)) {
          e.preventDefault();
          onActiveNavClick?.();
          return;
        }
        scheduleRouteTransitionBegin(e, () => onNavigate?.(href));
      }}
      {...navPointerIntentProps}
    />
  );

  return row;
}

const NAV_DRAWER_MS = 240;

function navDrawerAnimMs(): number {
  if (typeof window === "undefined") return NAV_DRAWER_MS;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : NAV_DRAWER_MS;
}

function MobileNavDrawer({
  open,
  onClose,
  navItems,
  onNavigate,
  isCompactShell,
  isNavLoading,
}: {
  open: boolean;
  onClose: () => void;
  navItems: GestionaleNavResolvedItem[];
  onNavigate?: (href: string) => void;
  isCompactShell: boolean;
  isNavLoading: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const panelState = closing ? "closing" : "open";

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    }
  }, [open]);

  useGestionaleMainScrollLock(mounted, "MobileNavDrawer");
  const swipeDismiss = useSwipeToDismiss(onClose, mounted && open && !closing);

  useEffect(() => {
    if (!mounted || open) return;
    if (swipeDismiss.swipeDismissedRef.current) {
      swipeDismiss.swipeDismissedRef.current = false;
      setMounted(false);
      setClosing(false);
      return;
    }
    setClosing(true);
    const id = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, navDrawerAnimMs());
    return () => window.clearTimeout(id);
  }, [mounted, open, swipeDismiss.swipeDismissedRef]);

  useOverlayBackHandler(mounted && open && !closing, onClose, "MobileNavDrawer");

  useEffect(() => {
    if (isCompactShell) return;
    setClosing(false);
    setMounted(false);
    onClose();
  }, [isCompactShell, onClose]);

  useEffect(() => {
    if (!mounted || closing || !open) return;
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
  }, [mounted, closing, open, onClose]);

  if (!mounted || !isCompactShell) return null;

  return (
    <div className={`fixed inset-0 ${dsZModalHigh} overscroll-none`} role="presentation">
      <button
        type="button"
        className={`cab-nav-drawer-backdrop absolute inset-0 touch-none bg-black/50 backdrop-blur-[1px] touch-manipulation${swipeDismiss.backdropProps.className ? ` ${swipeDismiss.backdropProps.className}` : ""}`}
        data-state={panelState}
        style={swipeDismiss.backdropProps.style}
        aria-label="Chiudi menu"
        onClick={onClose}
      />
      <div
        ref={swipeDismiss.panelRef}
        className={`cab-nav-drawer-panel cab-sidebar ${resolveDrawerAsideClasses("drawerNav")}${swipeDismiss.panelProps.className ? ` ${swipeDismiss.panelProps.className}` : ""}`}
        data-state={panelState}
        role="dialog"
        aria-modal="true"
        aria-label="Menu principale"
        style={swipeDismiss.panelProps.style}
        onTouchStart={swipeDismiss.panelProps.onTouchStart}
        onTouchMove={swipeDismiss.panelProps.onTouchMove}
        onTouchEnd={swipeDismiss.panelProps.onTouchEnd}
        onTouchCancel={swipeDismiss.panelProps.onTouchCancel}
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
            {isNavLoading ? (
              <SidebarNavSkeleton />
            ) : (
              navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  Icon={item.Icon as ComponentType<{ className?: string }>}
                  collapsed={false}
                  disabled={item.disabled}
                  badge={item.badge}
                  onActiveNavClick={onClose}
                  onNavigate={(href) => {
                    onNavigate?.(href);
                    onClose();
                  }}
                />
              ))
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  useBootInvestigationMount("AppShell");
  const [mobileOpen, setMobileOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const sidebarAsideRef = useRef<HTMLElement>(null);
  const shellColRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const shellLayout = useGestionaleShellLayoutSync({
    shellRef,
    shellColRef,
    mainRef: mainScrollRef,
  });
  const { isCompactShell, tier: shellTier, contentWidth: shellContentWidth } = shellLayout;
  const showMobileNavOpen = isCompactShell && shellContentWidth > 0;
  const contentGutter = gestionaleShellContentGutterClass(shellTier);
  useGestionaleScrollEnd(mainScrollRef);
  const {
    collapsed,
    sidebarExpanded,
    collapseSidebar,
    onSidebarMouseEnter,
    onSidebarMouseLeave,
    onSidebarNavIntent,
    onSidebarFocusCapture,
    onSidebarBlurCapture,
  } = useSidebarHoverExpand();
  const routeTransitionStartRef = useRef<number | null>(null);
  const { user } = useAuth();
  const pathname = usePathname();
  const suppressGlobalScrollEndPad = pathname.startsWith("/impostazioni");
  const rbac = useRbac();
  const { navAccess, snapshot, isNavLoading } = useRbacNavAccess();
  const clienteOnly = isClienteRole(user);
  const homePath = clienteOnly ? CLIENTE_HOME_PATH : "/dashboard";

  useLayoutEffect(() => {
    healBodyScrollLockState("app-shell-mount");
  }, []);

  const navItems = useMemo(() => {
    if (!navAccess || !snapshot?.resolved) return [] as GestionaleNavResolvedItem[];
    return buildGestionaleNav(snapshot.resolved, {
      hidePageKey: (pageKey) => navAccess.shouldHidePageKey(pageKey),
    });
  }, [navAccess, snapshot?.resolved]);

  useEffect(() => {
    if (routeTransitionStartRef.current != null) {
      const durationMs = Math.round(performance.now() - routeTransitionStartRef.current);
      recordHealthMetric("routeTransitionMs", durationMs);
      routeTransitionStartRef.current = null;
    }
    setMobileOpen(false);
    collapseSidebar();
  }, [pathname, collapseSidebar]);

  const beginRouteTransition = useCallback(
    (href: string) => {
      if (isNavTargetCurrent(pathname, href)) {
        return;
      }
      collapseSidebar();
      routeTransitionStartRef.current = performance.now();
    },
    [pathname, collapseSidebar],
  );

  const onHeaderHomeClick = useCallback(
    (e: ReactMouseEvent<HTMLAnchorElement>) => {
      if (pathname === homePath) {
        e.preventDefault();
        collapseSidebar();
        (e.currentTarget as HTMLElement).blur();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      scheduleRouteTransitionBegin(e, () => beginRouteTransition(homePath));
    },
    [beginRouteTransition, collapseSidebar, pathname, homePath],
  );

  const asideWidthClass = sidebarExpanded ? sidebarAsideWidthExpandedClass : sidebarAsideWidthCollapsedClass;
  const asideW = sidebarExpanded ? `${asideWidthClass} z-50` : asideWidthClass;
  const mainPad = isCompactShell ? "" : "pl-[4.25rem]";
  const sidebarTopOffset =
    "top-0 supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]";

  const openMobileNav = useCallback(() => {
    setMobileOpen(true);
  }, []);

  return (
    <GestionaleShellLayoutProvider value={shellLayout}>
    <ProfileSheetProvider>
    <MobileNavShellProvider openMobileNav={openMobileNav}>
    <div
      ref={shellRef}
      data-mobile-nav-visible={showMobileNavOpen ? "" : undefined}
      className={`cab-app-shell flex min-h-0 flex-col ${cabAppViewportFillClass} max-w-full overflow-hidden bg-[var(--cab-bg-app)] text-[color:var(--cab-text)]`}
    >
      <aside
        ref={sidebarAsideRef}
        data-sidebar-collapsed={collapsed ? "" : undefined}
        data-sidebar-hover-expanded={sidebarExpanded ? "" : undefined}
        onMouseEnter={onSidebarMouseEnter}
        onMouseLeave={onSidebarMouseLeave}
        onFocusCapture={(event) => {
          if (isSidebarNavLinkCurrent(event.target, pathname)) return;
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
          />
        ) : null}
        <nav
          className="cab-sidebar-nav gestionale-scrollbar flex min-h-0 min-w-0 flex-1 flex-col p-3 pb-0"
          aria-label="Sezioni principali"
          onPointerEnter={(event) => {
            if (!collapsed) return;
            if (isSidebarNavLinkCurrent(event.target, pathname)) return;
            if (event.target instanceof Element && event.target.closest(".cab-sidebar-nav-row")) {
              onSidebarNavIntent();
            }
          }}
        >
          <div className="gestionale-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch]">
            {isNavLoading ? (
              <SidebarNavSkeleton />
            ) : (
              navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  Icon={item.Icon as ComponentType<{ className?: string }>}
                  collapsed={collapsed}
                  disabled={item.disabled}
                  badge={item.badge}
                  onNavigate={beginRouteTransition}
                  onExpandIntent={onSidebarNavIntent}
                  onActiveNavClick={() => {
                    if (sidebarExpanded) collapseSidebar();
                  }}
                />
              ))
            )}
          </div>
        </nav>
      </aside>

      <div
        ref={shellColRef}
        className={`flex min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-[var(--cab-sidebar-width-motion)] ease-out ${mainPad}`}
      >
        <MobileNavDrawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          navItems={navItems}
          onNavigate={beginRouteTransition}
          isCompactShell={isCompactShell}
          isNavLoading={isNavLoading}
        />

        {process.env.NODE_ENV === "development" ? <DevAuditMounts /> : null}

        <div className={dsGestionaleContentRail}>
          <main
            ref={mainScrollRef}
            className={`gestionale-scroll-y gestionale-scrollbar w-full ${layoutResponsiveCoreScope} min-h-0 min-w-0 flex-1 pt-0 ${
              isCompactShell
                ? "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                : "pb-[max(1rem,env(safe-area-inset-bottom))]"
            }`}
          >
            <div className={`${dsGestionaleContentMax} ${layoutPageRoot} ${contentGutter}`}>
              {process.env.NODE_ENV === "development" ? (
                <ReactRenderAuditProfiler>{children}</ReactRenderAuditProfiler>
              ) : (
                children
              )}
              {!suppressGlobalScrollEndPad ? (
                <div aria-hidden className={dsGestionaleScrollEndPadFade} />
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
    </MobileNavShellProvider>
    </ProfileSheetProvider>
    </GestionaleShellLayoutProvider>
  );
}
