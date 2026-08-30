"use client";

/* eslint-disable react-hooks/preserve-manual-memoization -- lint phase2: preserve manual memoization contract */

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
export { SidebarNavSkeleton } from "@/components/gestionale/sidebar-nav-skeleton";

/** Layout SSOT: shellTopBarClass · cab-nav-drawer-panel · gestionale-scrollbar (AppShellSidebar / AppShellMain). */
import { AppShellMain } from "@/components/gestionale/app-shell-main";
import { isNavTargetCurrent } from "@/src/lib/navigation/route-transition";
import { useGestionaleScrollEnd } from "@/lib/ui/use-gestionale-scroll-end";
import { healBodyScrollLockState } from "@/lib/ui/body-scroll-lock-manager";
import { cabAppViewportFillClass, syncAppViewportFill } from "@/lib/ui/viewport-fill-sync";
import { isGestionaleOverlayActive, useSidebarHoverExpand } from "@/lib/ui/use-sidebar-collapsed";
import { useBootInvestigationMount } from "@/lib/observability/use-boot-investigation-mount";
import { useNavDrawerGesture } from "@/lib/ui/use-nav-drawer-gesture";
import { deriveMainInert, useNavDrawerMachine } from "@/lib/ui/mobile-nav-drawer-machine";
import { useNavigationBootInstrumentation } from "@/lib/observability/use-navigation-boot-instrumentation";
import { subscribeGestionaleViewport } from "@/lib/ui/gestionale-viewport-orchestrator";
import { ListSurfaceCookieSync } from "@/lib/ui/list-surface-cookie-sync";
import { useLastRouteRestore } from "@/src/hooks/use-last-route-restore";

export function AppShell({ children }: { children: React.ReactNode }) {
  useBootInvestigationMount("AppShell");
  const edgeDragAtRef = useRef(0);
  const drawer = useNavDrawerMachine(edgeDragAtRef);
  const { flags, open, forceClose, onPointerCancel, onVisibilityHidden, onResize } = drawer;
  const [overlayActive, setOverlayActive] = useState(false);
  const [edgeSnapVisuallyClosed, setEdgeSnapVisuallyClosed] = useState(false);
  const [dismissVisuallyClosed, setDismissVisuallyClosed] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const sidebarAsideRef = useRef<HTMLElement>(null);
  const shellColRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const shellTier = useGestionaleShellLayoutSync({
    shellRef,
    shellColRef,
    mainRef: mainScrollRef,
  });
  const shellContentWidth = useGestionaleShellContentWidth();
  const { isCompactShell, tier } = shellTier;
  const showMobileNavOpen = isCompactShell && shellContentWidth > 0;
  useNavigationBootInstrumentation(showMobileNavOpen);
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

  useLastRouteRestore({
    userId: user?.id,
    navAccess,
    snapshot,
    isNavLoading,
    homePath,
  });

  useLayoutEffect(() => {
    healBodyScrollLockState("app-shell-mount");
    syncAppViewportFill();
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

  const navGesture = useNavDrawerGesture({
    enabled: isCompactShell && (flags.canEdgeSwipe || flags.canDismiss) && !overlayActive,
    drawerState: flags.state,
    drawerMounted: flags.mounted,
    overlayActive,
    canEdgeSwipe: flags.canEdgeSwipe,
    canDismiss: flags.canDismiss,
    onEdgeDragStart: () => {
      edgeDragAtRef.current = Date.now();
      drawer.dispatch("EDGE_DRAG_START");
    },
    onEdgeDragCommit: () => drawer.dispatch("EDGE_DRAG_END_COMMIT"),
    onEdgeDragCancel: () => drawer.dispatch("EDGE_DRAG_END_CANCEL"),
    onEdgeSnapClosed: () => setEdgeSnapVisuallyClosed(true),
    onDismissDragStart: () => drawer.dispatch("DISMISS_DRAG_START"),
    onDismissDragCommit: () => {
      setDismissVisuallyClosed(true);
      drawer.dispatch("DISMISS_DRAG_END_COMMIT");
    },
    onDismissDragCancel: () => drawer.dispatch("DISMISS_DRAG_END_CANCEL"),
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
    if (!isCompactShell) return;
    return subscribeGestionaleViewport(() => {
      onResize();
    });
  }, [isCompactShell, onResize]);

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
        navGesturePanelProps={navGesture.panelProps}
        navGestureBackdropProps={navGesture.backdropProps}
        navGesturePanelRef={navGesture.panelRef}
        navGestureBackdropRef={navGesture.backdropRef}
        edgeSnapVisuallyClosed={edgeSnapVisuallyClosed}
        dismissVisuallyClosed={dismissVisuallyClosed}
        onEdgeSnapConsumed={() => setEdgeSnapVisuallyClosed(false)}
        onDismissSnapConsumed={() => setDismissVisuallyClosed(false)}
        navGestureResetDrag={navGesture.resetDrag}
      />

      <AppShellMain
        shellColRef={shellColRef}
        mainScrollRef={mainScrollRef}
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
