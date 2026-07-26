"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { buildGestionaleNav, type GestionaleNavResolvedItem } from "@/components/gestionale/gestionale-nav-config";
import { defaultHomePathForRole, resolveFirstAccessiblePageHrefFromResolved } from "@/lib/auth/rbac";
import { useRbac } from "@/src/hooks/use-rbac";
import { useRbacNavAccess } from "@/src/hooks/use-rbac-nav-access";
import { ProfileSheetProvider } from "@/components/profile/profile-sheet-context";
import { useGestionaleShellLayoutSync } from "@/lib/ui/use-gestionale-shell-layout-sync";
import { useGestionaleShellContentWidth } from "@/lib/ui/use-gestionale-shell-content-width";
import { GestionaleShellTierProvider } from "@/context/gestionale-shell-layout-context";
import { MobileNavShellProvider } from "@/context/mobile-nav-shell-context";
import { AppShellSidebar } from "@/components/gestionale/app-shell-sidebar";
import { AppShellMain } from "@/components/gestionale/app-shell-main";
import { isNavTargetCurrent } from "@/src/lib/navigation/route-transition";
import { useGestionaleScrollEnd } from "@/lib/ui/use-gestionale-scroll-end";
import { healBodyScrollLockState } from "@/lib/ui/body-scroll-lock-manager";
import { cabAppViewportFillClass } from "@/lib/ui/viewport-fill-sync";
import { isGestionaleOverlayActive, useSidebarHoverExpand } from "@/lib/ui/use-sidebar-collapsed";
import { useBootInvestigationMount } from "@/lib/observability/use-boot-investigation-mount";
import { useSwipeFromEdgeToOpen } from "@/lib/ui/use-swipe-from-edge-to-open";
import { deriveMainInert, useNavDrawerMachine } from "@/lib/ui/mobile-nav-drawer-machine";
import { usePullToRefresh } from "@/lib/ui/use-pull-to-refresh";
import { ListSurfaceCookieSync } from "@/lib/ui/list-surface-cookie-sync";

export function AppShell({ children }: { children: React.ReactNode }) {
  useBootInvestigationMount("AppShell");
  const edgeDragAtRef = useRef(0);
  const drawer = useNavDrawerMachine(edgeDragAtRef);
  const { flags, open, forceClose, onPointerCancel, onVisibilityHidden, onResize } = drawer;
  const [overlayActive, setOverlayActive] = useState(false);
  const [edgeSnapVisuallyClosed, setEdgeSnapVisuallyClosed] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const sidebarAsideRef = useRef<HTMLElement>(null);
  const shellColRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const pullContentRef = useRef<HTMLDivElement | null>(null);
  const shellTier = useGestionaleShellLayoutSync({
    shellRef,
    shellColRef,
    mainRef: mainScrollRef,
  });
  const shellContentWidth = useGestionaleShellContentWidth();
  const { isCompactShell, tier } = shellTier;
  const showMobileNavOpen = isCompactShell && shellContentWidth > 0;
  const pullToRefresh = usePullToRefresh({
    enabled: isCompactShell,
    scrollRef: mainScrollRef,
    contentRef: pullContentRef,
    overlayActive,
    navDrawerVisible: flags.navDrawerVisible,
    drawerState: flags.state,
  });
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
  const routePathnameRef = useRef("");
  const { user } = useAuth();
  const rbac = useRbac();
  const { navAccess, snapshot, isNavLoading } = useRbacNavAccess();
  const homePath = useMemo(() => {
    if (snapshot?.resolved) {
      return resolveFirstAccessiblePageHrefFromResolved(snapshot.resolved);
    }
    return defaultHomePathForRole(user, { rolePageAccess: rbac.effectivePermissions?.rolePageAccess });
  }, [snapshot?.resolved, user, rbac.effectivePermissions?.rolePageAccess]);

  useLayoutEffect(() => {
    healBodyScrollLockState("app-shell-mount");
  }, []);

  useEffect(() => {
    const sync = () => setOverlayActive(isGestionaleOverlayActive());
    sync();
    window.addEventListener("cab:gestionale-overlay-opened", sync);
    window.addEventListener("cab:gestionale-overlay-closed", sync);
    return () => {
      window.removeEventListener("cab:gestionale-overlay-opened", sync);
      window.removeEventListener("cab:gestionale-overlay-closed", sync);
    };
  }, []);

  const edgeSwipe = useSwipeFromEdgeToOpen({
    enabled: isCompactShell && flags.canEdgeSwipe && !overlayActive,
    drawerState: flags.state,
    drawerMounted: flags.mounted,
    overlayActive,
    onBegin: () => {
      edgeDragAtRef.current = Date.now();
      drawer.dispatch("EDGE_DRAG_START");
    },
    onCommit: () => drawer.dispatch("EDGE_DRAG_END_COMMIT"),
    onCancel: () => drawer.dispatch("EDGE_DRAG_END_CANCEL"),
    onSnapClosed: () => setEdgeSnapVisuallyClosed(true),
    onPointerCancel,
    onDragProgress: () => {
      edgeDragAtRef.current = Date.now();
    },
  });

  useEffect(() => {
    if (!isCompactShell) forceClose();
  }, [forceClose, isCompactShell]);

  useEffect(() => {
    function onVisibility() {
      if (document.hidden) onVisibilityHidden();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [onVisibilityHidden]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    function onResizeDebounced() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onResize(), 100);
    }
    window.addEventListener("resize", onResizeDebounced);
    window.visualViewport?.addEventListener("resize", onResizeDebounced);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("resize", onResizeDebounced);
      window.visualViewport?.removeEventListener("resize", onResizeDebounced);
    };
  }, [onResize]);

  const navItems = useMemo(() => {
    if (!navAccess || !snapshot?.resolved) return [] as GestionaleNavResolvedItem[];
    return buildGestionaleNav(snapshot.resolved, {
      hidePageKey: (pageKey) => navAccess.shouldHidePageKey(pageKey),
    });
  }, [navAccess, snapshot?.resolved]);

  const beginRouteTransition = useCallback(
    (href: string) => {
      if (isNavTargetCurrent(routePathnameRef.current, href)) {
        return;
      }
      collapseSidebar();
      routeTransitionStartRef.current = performance.now();
    },
    [collapseSidebar],
  );

  return (
    <GestionaleShellTierProvider value={shellTier}>
    <ProfileSheetProvider>
    <MobileNavShellProvider
      openMobileNav={open}
      isNavDrawerOpen={flags.navDrawerVisible}
    >
    <div
      ref={shellRef}
      data-mobile-nav-visible={showMobileNavOpen ? "" : undefined}
      className={`cab-app-shell flex min-h-0 flex-col ${cabAppViewportFillClass} max-w-full overflow-hidden bg-[var(--cab-bg-app)] text-[color:var(--cab-text)]`}
    >
      <ListSurfaceCookieSync />
      <AppShellSidebar
        homePath={homePath}
        navItems={navItems}
        isNavLoading={isNavLoading}
        isCompactShell={isCompactShell}
        collapsed={collapsed}
        sidebarExpanded={sidebarExpanded}
        asideRef={sidebarAsideRef}
        onSidebarMouseEnter={onSidebarMouseEnter}
        onSidebarMouseLeave={onSidebarMouseLeave}
        onSidebarFocusCapture={onSidebarFocusCapture}
        onSidebarBlurCapture={onSidebarBlurCapture}
        onSidebarNavIntent={onSidebarNavIntent}
        collapseSidebar={collapseSidebar}
        beginRouteTransition={beginRouteTransition}
        routeTransitionStartRef={routeTransitionStartRef}
        routePathnameRef={routePathnameRef}
        drawer={drawer}
        overlayActive={overlayActive}
        edgeSwipePanelProps={edgeSwipe.panelProps}
        edgeSwipeBackdropProps={edgeSwipe.backdropProps}
        edgeSwipePanelRef={edgeSwipe.panelRef}
        edgeSwipeBackdropRef={edgeSwipe.backdropRef}
        edgeSnapVisuallyClosed={edgeSnapVisuallyClosed}
        onEdgeSnapConsumed={() => setEdgeSnapVisuallyClosed(false)}
        edgeResetDrag={edgeSwipe.resetDrag}
      />

      <AppShellMain
        shellColRef={shellColRef}
        mainScrollRef={mainScrollRef}
        pullContentRef={pullContentRef}
        pullToRefreshPhase={pullToRefresh.phase}
        pullToRefreshProgress={pullToRefresh.progress}
        isCompactShell={isCompactShell}
        shellTier={tier}
        mainInert={deriveMainInert(flags.state)}
      >
        {children}
      </AppShellMain>
    </div>
    </MobileNavShellProvider>
    </ProfileSheetProvider>
    </GestionaleShellTierProvider>
  );
}
