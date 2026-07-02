"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { CloseButton, Tooltip } from "@/components/design-system";
import { useAuth } from "@/context/auth-context";
import { useGlobalLoading } from "@/context/global-loading-context";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import { erpFocus } from "@/lib/ui/erp-tokens";
import { resolveGestionaleNav, type GestionaleNavResolvedItem } from "@/components/gestionale/gestionale-nav-config";
import { CLIENTE_HOME_PATH, shouldHideNavHref, isClienteRole } from "@/lib/auth/rbac";
import { useRbac } from "@/src/hooks/use-rbac";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { useOperatorGlobalSettings } from "@/src/context/operator-global-settings-context";
import { CabLogo, CAB_APP_PRODUCT_NAME } from "@/components/gestionale/cab-logo";
import { SidebarSessionPanel } from "@/components/gestionale/sidebar-session-panel";
import {
  SidebarNavIconWrap,
  sidebarNavIconShellActive,
  sidebarNavIconShellInactive,
  sidebarNavLinkActive,
  sidebarNavLinkBase,
  sidebarNavLinkInactive,
} from "@/components/gestionale/sidebar-nav-icon-wrap";
import { ProfileSheetProvider } from "@/components/profile/profile-sheet-context";
import {
  dsGestionaleContentMax,
  dsGestionaleContentRail,
  dsZModalHigh,
} from "@/lib/ui/design-system";
import { layoutPageRoot, layoutResponsiveCoreScope } from "@/lib/ui/responsive-layout-core";
import { gestionaleShellContentGutterClass } from "@/lib/ui/gestionale-shell-layout";
import { useGestionaleShellLayoutSync } from "@/lib/ui/use-gestionale-shell-layout-sync";
import { GestionaleShellLayoutProvider } from "@/context/gestionale-shell-layout-context";
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
  ROUTE_LOADING_FAILSAFE_MS,
  ROUTE_TRANSITION_CANCEL_EVENT,
  scheduleRouteTransitionBegin,
} from "@/src/lib/navigation/route-transition";
import { useGestionaleMainScrollLock } from "@/lib/ui/use-body-scroll-lock";
import { useGestionaleScrollEnd } from "@/lib/ui/use-gestionale-scroll-end";
import { dsGestionaleScrollEndPad } from "@/lib/ui/scroll-system";
import { useOverlayBackHandler } from "@/lib/ui/use-overlay-back-handler";
import { healBodyScrollLockState } from "@/lib/ui/body-scroll-lock-manager";
import { cabAppViewportFillClass } from "@/lib/ui/viewport-fill-sync";
import { useSidebarHoverExpand } from "@/lib/ui/use-sidebar-collapsed";
import { recordHealthMetric } from "@/lib/observability/runtime-health";
import { isBootInvestigationEnabled, logBoot, trackRedirect, trackStoreUpdate } from "@/lib/observability/boot-investigation";
import { useBootInvestigationMount } from "@/lib/observability/use-boot-investigation-mount";
import { resolveDrawerAsideClasses } from "@/lib/ui/modal-max-width-class";

const mobileNavOpenBtnClass = `inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] text-lg shadow-[var(--cab-shadow-sm)] hover:bg-[var(--cab-hover)] dark:border-[color:var(--cab-border-strong)] ${erpFocus}`;

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
  Icon: (p: { className?: string }) => ReactNode;
  collapsed: boolean;
  disabled?: boolean;
  badge?: string | null;
  onNavigate?: (href: string) => void;
  onExpandIntent?: () => void;
  onActiveNavClick?: () => void;
}) {
  const pathname = usePathname();
  const active = isNavTargetCurrent(pathname, href);

  const iconWrap = (
    <SidebarNavIconWrap
      shellClass={active && !disabled ? sidebarNavIconShellActive : sidebarNavIconShellInactive}
      dimmed={disabled}
    >
      <Icon className="h-4 w-4" />
    </SidebarNavIconWrap>
  );

  const navPointerIntentProps = collapsed
    ? {
        onPointerEnter: () => onExpandIntent?.(),
        onFocus: () => onExpandIntent?.(),
      }
    : {};

  if (disabled) {
    const node = (
      <div
        role="link"
        aria-disabled="true"
        className={`${sidebarNavLinkBase} cursor-not-allowed opacity-75`}
        {...navPointerIntentProps}
      >
        {iconWrap}
        <span className="cab-sidebar-nav-label min-w-0 truncate leading-tight">{label}</span>
        {badge ? (
          <span className="cab-sidebar-nav-badge max-w-[4rem] shrink-0 overflow-hidden rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
            {badge}
          </span>
        ) : null}
      </div>
    );
    if (!collapsed) return node;
    return (
      <Tooltip content={badge ? "Non disponibile" : label} side="right">
        {node}
      </Tooltip>
    );
  }

  const node = (
    <Link
      href={href}
      onClick={(e) => {
        if (isNavTargetCurrent(pathname, href)) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
          onActiveNavClick?.();
          return;
        }
        scheduleRouteTransitionBegin(e, () => onNavigate?.(href));
      }}
      className={`${sidebarNavLinkBase} ${active ? sidebarNavLinkActive : sidebarNavLinkInactive} ${erpFocus}`}
      {...navPointerIntentProps}
    >
      {iconWrap}
      <span className="cab-sidebar-nav-label min-w-0 truncate leading-tight">{label}</span>
    </Link>
  );

  if (!collapsed) return node;

  return (
    <Tooltip content={label} side="right">
      {node}
    </Tooltip>
  );
}

function MobileNavRow({
  item,
  pathname,
  onClose,
  onNavigate,
}: {
  item: GestionaleNavResolvedItem;
  pathname: string;
  onClose: () => void;
  onNavigate?: (href: string) => void;
}) {
  const active = isNavTargetCurrent(pathname, item.href);
  const Icon = item.Icon;
  if (item.disabled) {
    return (
      <div
        className={`flex min-h-[3.25rem] items-center gap-3 rounded-xl px-3 text-base font-semibold text-zinc-400 dark:text-zinc-500 ${
          active ? "bg-zinc-100/80 dark:bg-zinc-800/50" : ""
        }`}
        aria-disabled
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.badge ? (
          <span className="shrink-0 rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
            {item.badge}
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={(e) => {
        if (isNavTargetCurrent(pathname, item.href)) return;
        scheduleRouteTransitionBegin(e, () => {
          onNavigate?.(item.href);
          onClose();
        });
      }}
      className={`flex min-h-[3.25rem] items-center gap-3 rounded-xl px-3 text-base font-semibold ${
        active
          ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_16%,var(--cab-card))] text-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-text))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_28%,transparent)] dark:text-white"
          : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
      } ${erpFocus}`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          active
            ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-card))] text-[color:var(--cab-primary)]"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        }`}
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
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
}: {
  open: boolean;
  onClose: () => void;
  navItems: GestionaleNavResolvedItem[];
  onNavigate?: (href: string) => void;
  isCompactShell: boolean;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const panelState = closing ? "closing" : "open";

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    }
  }, [open]);

  useEffect(() => {
    if (!mounted || open) return;
    setClosing(true);
    const id = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, navDrawerAnimMs());
    return () => window.clearTimeout(id);
  }, [mounted, open]);

  useGestionaleMainScrollLock(mounted, "MobileNavDrawer");
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
        className="cab-nav-drawer-backdrop absolute inset-0 touch-none bg-black/50 backdrop-blur-[1px] touch-manipulation"
        data-state={panelState}
        aria-label="Chiudi menu"
        onClick={onClose}
      />
      <div
        className={`cab-nav-drawer-panel ${resolveDrawerAsideClasses("drawerNav")}`}
        data-state={panelState}
        role="dialog"
        aria-modal="true"
        aria-label="Menu principale"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={`${shellTopBarClass} shrink-0 grid grid-cols-[1fr_auto_1fr] items-center px-4`}>
          <span className="min-w-0" aria-hidden />
          <CabLogo height={32} className="shrink-0" sizes="112px" priority />
          <div className="flex min-w-0 items-center justify-end">
            <CloseButton onClick={onClose} />
          </div>
        </div>
        <SidebarSessionPanel variant="drawer" placement="brand" onOpenInbox={onClose} />
        <nav
          className="cab-sidebar-nav gestionale-scrollbar flex min-h-0 min-w-0 flex-1 flex-col p-3 pb-0"
          aria-label="Sezioni principali"
        >
          <div className="gestionale-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
            {navItems.map((item) => (
              <MobileNavRow key={item.href} item={item} pathname={pathname} onClose={onClose} onNavigate={onNavigate} />
            ))}
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
  const { isCompactShell, tier: shellTier } = shellLayout;
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
  const [routeLoading, setRouteLoading] = useState(false);
  const routeTransitionStartRef = useRef<number | null>(null);
  const { user } = useAuth();
  const pathname = usePathname();
  const suppressGlobalScrollEndPad = pathname.startsWith("/impostazioni");
  const rbac = useRbac();
  const clientLavAccess = useClientLavorazioniAccess();
  const operatorPilot = useOperatorGlobalSettings();
  const clienteOnly = isClienteRole(user);
  const homePath = clienteOnly ? CLIENTE_HOME_PATH : "/dashboard";
  useGlobalLoading(routeLoading ? GLOBAL_LOADING_MESSAGES.navigation : null);

  const prevRouteLoadingRef = useRef(false);
  useEffect(() => {
    if (!isBootInvestigationEnabled()) return;
    if (prevRouteLoadingRef.current === routeLoading) return;
    trackStoreUpdate("routeLoading", prevRouteLoadingRef.current, routeLoading, { pathname });
    logBoot("RENDER", "AppShell", { routeLoading, pathname }, routeLoading ? "route_loading_on" : "route_loading_off");
    prevRouteLoadingRef.current = routeLoading;
  }, [routeLoading, pathname]);

  useLayoutEffect(() => {
    healBodyScrollLockState("app-shell-mount");
  }, []);

  const navItems = useMemo(
    () =>
      resolveGestionaleNav({
        hideHref: (href) =>
          shouldHideNavHref(
            user,
            href,
            {
              clientLavorazioniAllowed: clientLavAccess.allowed,
            },
            { operatorGlobalSettingsDbEnabled: operatorPilot.dbEnabled },
          ),
      }),
    [user, clientLavAccess.allowed, operatorPilot.dbEnabled],
  );

  useEffect(() => {
    if (routeTransitionStartRef.current != null) {
      const durationMs = Math.round(performance.now() - routeTransitionStartRef.current);
      recordHealthMetric("routeTransitionMs", durationMs);
      routeTransitionStartRef.current = null;
    }
    setRouteLoading(false);
    setMobileOpen(false);
    collapseSidebar();
  }, [pathname, collapseSidebar]);

  useEffect(() => {
    if (!routeLoading) return;
    const timeoutId = window.setTimeout(() => setRouteLoading(false), ROUTE_LOADING_FAILSAFE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [routeLoading]);

  useEffect(() => {
    function onCancelRouteTransition() {
      setRouteLoading(false);
    }
    function onPopState() {
      setRouteLoading(false);
    }
    function onPageShow() {
      setRouteLoading(false);
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") setRouteLoading(false);
    }
    window.addEventListener(ROUTE_TRANSITION_CANCEL_EVENT, onCancelRouteTransition);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener(ROUTE_TRANSITION_CANCEL_EVENT, onCancelRouteTransition);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const beginRouteTransition = useCallback(
    (href: string) => {
      if (isNavTargetCurrent(pathname, href)) {
        setRouteLoading(false);
        return;
      }
      collapseSidebar();
      routeTransitionStartRef.current = performance.now();
      setRouteLoading(true);
    },
    [pathname, collapseSidebar],
  );

  const onHeaderHomeClick = useCallback(
    (e: ReactMouseEvent<HTMLAnchorElement>) => {
      if (pathname === homePath) {
        e.preventDefault();
        setRouteLoading(false);
        collapseSidebar();
        (e.currentTarget as HTMLElement).blur();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      scheduleRouteTransitionBegin(e, () => beginRouteTransition(homePath));
    },
    [beginRouteTransition, collapseSidebar, pathname, homePath],
  );

  const asideWidthClass = sidebarExpanded ? "w-[12.75rem]" : "w-[4.25rem]";
  const asideW = sidebarExpanded ? `${asideWidthClass} z-50` : asideWidthClass;
  const mainPad = isCompactShell ? "" : "pl-[4.25rem]";
  const sidebarTopOffset =
    "top-0 supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]";

  return (
    <GestionaleShellLayoutProvider value={shellLayout}>
    <ProfileSheetProvider>
    <div
      ref={shellRef}
      className={`cab-app-shell flex min-h-0 flex-col ${cabAppViewportFillClass} max-w-full overflow-hidden bg-[var(--cab-bg-app)] text-[color:var(--cab-text)]`}
    >
      {isCompactShell ? (
          <button
            type="button"
            data-testid="smoke-nav-drawer-open"
            className={`cab-mobile-nav-open fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 ${mobileNavOpenBtnClass}`}
            aria-label="Apri menu"
            onClick={() => setMobileOpen(true)}
          >
            ☰
          </button>
      ) : null}

      <aside
        ref={sidebarAsideRef}
        data-sidebar-collapsed={collapsed ? "" : undefined}
        data-sidebar-hover-expanded={sidebarExpanded ? "" : undefined}
        onMouseEnter={onSidebarMouseEnter}
        onMouseLeave={onSidebarMouseLeave}
        onFocusCapture={onSidebarFocusCapture}
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
            className={`${erpFocus} flex min-h-10 min-w-0 items-center justify-center overflow-hidden rounded-lg transition-opacity duration-200 hover:opacity-90`}
          >
            <CabLogo height={28} className="shrink-0" sizes="112px" priority />
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
            if (event.target instanceof Element && event.target.closest(".cab-sidebar-nav-link")) {
              onSidebarNavIntent();
            }
          }}
        >
          <div className="gestionale-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch]">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.Icon}
                collapsed={collapsed}
                disabled={item.disabled}
                badge={item.badge}
                onNavigate={beginRouteTransition}
                onExpandIntent={onSidebarNavIntent}
                onActiveNavClick={collapseSidebar}
              />
            ))}
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
                <div aria-hidden className={dsGestionaleScrollEndPad} />
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
    </ProfileSheetProvider>
    </GestionaleShellLayoutProvider>
  );
}
