"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { CloseButton, Tooltip } from "@/components/design-system";
import { useAuth } from "@/context/auth-context";
import { useGlobalLoading, useShowGlobalLoading } from "@/context/global-loading-context";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { resolveGestionaleNav, type GestionaleNavResolvedItem } from "@/components/gestionale/gestionale-nav-config";
import { CLIENTE_HOME_PATH, shouldHideNavHref, isClienteRole } from "@/lib/auth/rbac";
import { useRbac } from "@/src/hooks/use-rbac";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { useOperatorGlobalSettings } from "@/src/context/operator-global-settings-context";
import { ThemeModeIcon, ThemeToggle } from "@/components/gestionale/theme-toggle";
import { CabLogo, CAB_APP_PRODUCT_NAME } from "@/components/gestionale/cab-logo";
import { UserProfileAvatar } from "@/components/gestionale/user-profile-avatar";
import {
  dsGestionaleContentGutter,
  dsGestionaleContentMax,
  dsGestionaleContentRail,
  dsGestionaleContentShellRow,
  dsPageToolbarBtn,
  dsZModalHigh,
} from "@/lib/ui/design-system";
import { layoutPageRoot, layoutResponsiveCoreScope } from "@/lib/ui/responsive-layout-core";
import { ResponsiveLayoutAuditMount } from "@/components/gestionale/responsive-layout-audit-mount";
import { VisualLayoutLinterMount } from "@/components/gestionale/visual-layout-linter-mount";
import { DesignSystemLockMount } from "@/components/gestionale/design-system-lock-mount";
import { UiOsShadowMount } from "@/components/gestionale/ui-os-shadow-mount";
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
import { useSidebarCollapsed } from "@/lib/ui/use-sidebar-collapsed";
import { recordHealthMetric } from "@/lib/observability/runtime-health";
import { resolveDrawerAsideClasses } from "@/lib/ui/modal-max-width-class";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";

const shellTopBarClass =
  "flex h-14 shrink-0 items-center border-b border-[color:var(--cab-border)]";

const navLinkBase =
  "cab-sidebar-nav-link group relative flex min-h-10 shrink-0 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium";

const navLinkInactive =
  "text-zinc-600 hover:bg-zinc-100/95 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/90 dark:hover:text-zinc-100";

const navLinkActive =
  "bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-text))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_22%,transparent)] before:absolute before:left-0 before:top-1/2 before:h-8 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-[color:var(--cab-primary)] dark:bg-[color:color-mix(in_srgb,var(--cab-primary)_18%,var(--cab-card))] dark:text-white dark:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_35%,transparent)]";

function NavLink({
  href,
  label,
  Icon,
  collapsed,
  disabled,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => ReactNode;
  collapsed: boolean;
  disabled?: boolean;
  badge?: string | null;
  onNavigate?: (href: string) => void;
}) {
  const pathname = usePathname();
  const active = isNavTargetCurrent(pathname, href);

  const iconWrap = (
    <span
      className={`cab-sidebar-nav-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
        active && !disabled
          ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-surface-2))] text-[color:var(--cab-primary)]"
          : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 group-hover:text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-400 dark:group-hover:bg-zinc-700 dark:group-hover:text-zinc-200"
      } ${disabled ? "opacity-60" : ""}`}
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  );

  if (disabled) {
    const node = (
      <div
        role="link"
        aria-disabled="true"
        className={`${navLinkBase} cursor-not-allowed opacity-75`}
      >
        {iconWrap}
        <span className="cab-sidebar-nav-label min-w-0 truncate leading-tight">{label}</span>
        {badge ? (
          <span className="cab-sidebar-nav-badge ml-auto max-w-[4rem] shrink-0 overflow-hidden rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
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
        if (isNavTargetCurrent(pathname, href)) return;
        scheduleRouteTransitionBegin(e, () => onNavigate?.(href));
      }}
      className={`${navLinkBase} ${active ? navLinkActive : navLinkInactive} ${erpFocus}`}
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

function AccountMenu() {
  const { user, logout, status } = useAuth();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const { style: portalStyle, scrollInside, placementOriginClass, isPositioned } =
    useGlobalDropdownPortal({
      open,
      anchorRef: triggerRef,
      contentRef: menuRef,
      placement: "bottom-end",
      matchAnchorWidth: false,
      panelWidth: 208,
      maxHeight: 384,
    });

  useDropdownOutsideDismiss(open, triggerRef, menuRef, close, { when: isPositioned });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const showGlobalLoading = useShowGlobalLoading();

  async function onLogout() {
    close();
    showGlobalLoading(GLOBAL_LOADING_MESSAGES.logout);
    await logout();
    window.location.assign("/login");
  }

  const label = user?.nome?.trim() || "Account";

  const menu =
    open && portalStyle ? (
      <div
        ref={menuRef}
        role="menu"
        style={portalStyle}
        className={`min-w-[13rem] w-52 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] py-1 text-sm shadow-[var(--cab-shadow-lg)] gestionale-scrollbar ${placementOriginClass} ${
          scrollInside ? "overflow-y-auto" : "overflow-hidden"
        }`}
      >
        <div className="border-b border-[color:var(--cab-border)] px-3 py-2.5">
          <p className="truncate text-xs font-semibold text-[color:var(--cab-text)]">
            {user?.nome ?? "Utente"}
          </p>
          <p className="truncate text-[10px] text-[color:var(--cab-text-muted)]">
            {user?.email ? user.email : ""}
          </p>
        </div>
        <div
          role="none"
          className="flex min-h-11 items-center justify-between gap-2 border-b border-[color:var(--cab-border)] px-3 py-2"
        >
          <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-[color:var(--cab-text-muted)]">
            <ThemeModeIcon className="h-4 w-4 shrink-0" />
            Aspetto
          </span>
          <ThemeToggle variant="switch" />
        </div>
        <button
          type="button"
          role="menuitem"
          data-testid="smoke-logout"
          onClick={() => void onLogout()}
          className={`flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)] ${erpFocus}`}
        >
          <span className="text-[color:var(--cab-text-muted)]" aria-hidden>
            ⎋
          </span>
          Esci
        </button>
      </div>
    ) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        data-testid="smoke-account-menu"
        onClick={() => setOpen((v) => !v)}
        className={`${dsPageToolbarBtn} h-11 min-w-0 max-w-[min(14rem,42vw)] justify-start gap-2 px-2.5 py-0 text-left text-xs sm:max-w-[14rem] ${erpFocus}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserProfileAvatar
          nome={user?.nome ?? (status === "loading" ? "·" : undefined)}
          email={user?.email}
          variant="header"
        />
        <span
          className="min-w-0 flex-1 truncate font-medium text-[color:var(--cab-text)]"
          suppressHydrationWarning
        >
          {label}
        </span>
        <span className="shrink-0 text-[color:var(--cab-text-muted)]" aria-hidden>
          ▾
        </span>
      </button>
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </div>
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
}: {
  open: boolean;
  onClose: () => void;
  navItems: GestionaleNavResolvedItem[];
  onNavigate?: (href: string) => void;
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
    const mq = window.matchMedia("(min-width: 768px)");
    function dismissForDesktop() {
      if (!mq.matches) return;
      setClosing(false);
      setMounted(false);
      onClose();
    }
    dismissForDesktop();
    mq.addEventListener("change", dismissForDesktop);
    return () => mq.removeEventListener("change", dismissForDesktop);
  }, [onClose]);

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

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 ${dsZModalHigh} overscroll-none md:hidden`} role="presentation">
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
        <nav
          className="cab-sidebar-nav gestionale-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]"
          aria-label="Sezioni principali"
        >
          {navItems.map((item) => (
            <MobileNavRow key={item.href} item={item} pathname={pathname} onClose={onClose} onNavigate={onNavigate} />
          ))}
        </nav>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();
  const [routeLoading, setRouteLoading] = useState(false);
  const routeTransitionStartRef = useRef<number | null>(null);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  useGestionaleScrollEnd(mainScrollRef);
  const { user } = useAuth();
  const pathname = usePathname();
  const rbac = useRbac();
  const clientLavAccess = useClientLavorazioniAccess();
  const operatorPilot = useOperatorGlobalSettings();
  const clienteOnly = isClienteRole(user);
  const homePath = clienteOnly ? CLIENTE_HOME_PATH : "/dashboard";
  useGlobalLoading(routeLoading ? GLOBAL_LOADING_MESSAGES.navigation : null);

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
  }, [pathname]);

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
      routeTransitionStartRef.current = performance.now();
      setRouteLoading(true);
    },
    [pathname],
  );

  const onHeaderHomeClick = useCallback(
    (e: ReactMouseEvent<HTMLAnchorElement>) => {
      if (pathname === homePath) {
        e.preventDefault();
        setRouteLoading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      scheduleRouteTransitionBegin(e, () => beginRouteTransition(homePath));
    },
    [beginRouteTransition, pathname, homePath],
  );

  const asideW = collapsed ? "md:w-[4.25rem]" : "md:w-[12.75rem]";
  const mainPad = collapsed ? "md:pl-[4.25rem]" : "md:pl-[12.75rem]";

  return (
    <div className={`cab-app-shell flex min-h-0 ${cabAppViewportFillClass} max-w-full overflow-hidden bg-[var(--cab-bg-app)] text-[color:var(--cab-text)]`}>
      <aside
        data-sidebar-collapsed={collapsed ? "" : undefined}
        className={`cab-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col overflow-x-hidden border-r border-[color:var(--cab-border)] bg-[var(--cab-card)] transition-[width] duration-250 ease-out md:flex ${asideW}`}
      >
        <div
          className={
            collapsed
              ? `${shellTopBarClass} justify-center px-1.5`
              : "grid h-14 shrink-0 grid-cols-[1fr_auto] items-center gap-2 border-b border-[color:var(--cab-border)] px-3"
          }
        >
          {!collapsed ? (
            <div className="flex h-9 min-w-0 items-center justify-center">
              <Link
                href={homePath}
                onClick={onHeaderHomeClick}
                aria-label={CAB_APP_PRODUCT_NAME}
                className={`${erpFocus} flex h-9 min-w-0 items-center rounded-lg`}
              >
                <CabLogo height={32} priority sizes="112px" />
              </Link>
            </div>
          ) : null}
          <Tooltip content={collapsed ? "Espandi" : "Comprimi"} side="right">
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Espandi menu laterale" : "Comprimi menu laterale"}
              className={`${erpFocus} hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] text-sm text-[color:var(--cab-text-muted)] transition-[background-color,border-color,color,transform] duration-200 ease-out hover:bg-[var(--cab-hover)] md:inline-flex dark:border-[color:var(--cab-border-strong)]`}
              suppressHydrationWarning
            >
              {collapsed ? "⟩" : "⟨"}
            </button>
          </Tooltip>
        </div>
        <nav
          className="cab-sidebar-nav gestionale-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden p-3"
          aria-label="Sezioni principali"
        >
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
            />
          ))}
        </nav>
      </aside>

      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-250 ease-out ${mainPad}`}
      >
        <header className="cab-ios-sticky-header shrink-0 border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-card)_92%,transparent)] backdrop-blur-md supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
          <div className="cab-gestionale-scroll-gutter-mirror w-full min-w-0">
            <div className={dsGestionaleContentShellRow}>
              <div
                className={`${dsGestionaleContentGutter} flex h-14 min-w-0 items-center gap-3 max-md:grid max-md:grid-cols-[auto_1fr_auto] max-md:items-center max-md:gap-0 md:justify-between`}
              >
              <div className="flex min-w-0 items-center justify-start gap-3 max-md:contents">
              <button
                type="button"
                data-testid="smoke-nav-drawer-open"
                className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] text-lg shadow-[var(--cab-shadow-sm)] hover:bg-[var(--cab-hover)] md:hidden dark:border-[color:var(--cab-border-strong)] ${erpFocus}`}
                aria-label="Apri menu"
                onClick={() => setMobileOpen(true)}
              >
                ☰
              </button>
              <Link
                href={homePath}
                onClick={onHeaderHomeClick}
                aria-label={CAB_APP_PRODUCT_NAME}
                className={`${erpFocus} inline-flex min-h-11 min-w-0 items-center justify-center rounded-lg transition-opacity duration-200 hover:opacity-90 max-md:justify-self-center md:justify-start md:py-2`}
              >
                <CabLogo
                  height={32}
                  className="shrink-0 md:hidden"
                  sizes="112px"
                  priority
                />
                <CabLogo
                  height={32}
                  className="hidden shrink-0 md:block"
                  sizes="112px"
                  priority
                />
              </Link>
              </div>
              <div className="flex min-w-0 items-center justify-end">
                <AccountMenu />
              </div>
              </div>
            </div>
          </div>
        </header>

        <MobileNavDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} navItems={navItems} onNavigate={beginRouteTransition} />

        <ResponsiveLayoutAuditMount />
        <VisualLayoutLinterMount />
        <DesignSystemLockMount />
        <UiOsShadowMount />

        <div className={dsGestionaleContentRail}>
          <main
            ref={mainScrollRef}
            className={`gestionale-scroll-y gestionale-scrollbar w-full ${layoutResponsiveCoreScope} min-h-0 min-w-0 flex-1 pt-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-[max(1rem,env(safe-area-inset-bottom))]`}
          >
            <div className={`${dsGestionaleContentMax} ${layoutPageRoot} ${dsGestionaleContentGutter}`}>
              {children}
              <div aria-hidden className={dsGestionaleScrollEndPad} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
