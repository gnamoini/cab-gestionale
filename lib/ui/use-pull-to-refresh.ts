"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { NavDrawerState } from "@/lib/ui/mobile-nav-drawer-contract";
import { resolveActivationZonePx } from "@/lib/ui/mobile-nav-drawer-contract";
import { isBlockingOverlayVisible } from "@/lib/ui/overlay-back-stack";
import { canPullToRefreshClaimGesture, type GestureContext } from "@/lib/ui/gesture-arbitration";
import {
  isScrollAtTop,
  isVerticalPullGesture,
  pullProgress,
  resolvePullScrollport,
  rubberBandPullY,
  shouldCommitPullToRefresh,
  type PullToRefreshPhase,
} from "@/lib/ui/pull-to-refresh-contract";
import { usePointerGesture } from "@/lib/ui/use-pointer-gesture";

const ACTIVATION_PX = 8;

type DragState = {
  startX: number;
  startY: number;
  active: boolean;
  pulling: boolean;
  scrollport: HTMLElement | null;
};

function isEditableFocused(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type UsePullToRefreshOptions = {
  enabled: boolean;
  scrollRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  overlayActive: boolean;
  navDrawerVisible: boolean;
  drawerState: NavDrawerState;
};

export type UsePullToRefreshResult = {
  phase: PullToRefreshPhase;
  pullPx: number;
  progress: number;
};

export function usePullToRefresh({
  enabled,
  scrollRef,
  contentRef,
  overlayActive,
  navDrawerVisible,
  drawerState,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const [phase, setPhase] = useState<PullToRefreshPhase>("idle");
  const [pullPx, setPullPx] = useState(0);
  const dragRef = useRef<DragState>({
    startX: 0,
    startY: 0,
    active: false,
    pulling: false,
    scrollport: null,
  });
  const phaseRef = useRef<PullToRefreshPhase>("idle");
  const refreshingRef = useRef(false);
  const pullPxRef = useRef(0);

  const setPhaseSafe = useCallback((next: PullToRefreshPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const applyTransform = useCallback(
    (offsetPx: number) => {
      const node = contentRef.current;
      if (!node) return;
      if (offsetPx <= 0) {
        node.style.transform = "";
        node.style.transition = "";
        return;
      }
      node.style.transform = `translate3d(0, ${offsetPx}px, 0)`;
      node.style.transition = "none";
    },
    [contentRef],
  );

  const resetPull = useCallback(() => {
    dragRef.current = { startX: 0, startY: 0, active: false, pulling: false, scrollport: null };
    setPullPx(0);
    pullPxRef.current = 0;
    applyTransform(0);
    if (!refreshingRef.current) setPhaseSafe("idle");
  }, [applyTransform, setPhaseSafe]);

  const runRefresh = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setPhaseSafe("refreshing");
    applyTransform(0);
    pullPxRef.current = 0;
    setPullPx(0);
    window.location.reload();
  }, [applyTransform, setPhaseSafe]);

  const guardsBlock = useCallback((): boolean => {
    if (!enabled) return true;
    if (overlayActive || navDrawerVisible || isBlockingOverlayVisible()) return true;
    if (isEditableFocused()) return true;
    if (refreshingRef.current || phaseRef.current === "refreshing") return true;
    return false;
  }, [enabled, navDrawerVisible, overlayActive]);

  const buildGestureContext = useCallback(
    (target: Element, clientX: number, clientY: number): GestureContext => ({
      target,
      clientX,
      clientY,
      drawerState,
      overlayActive,
      keyboardOpen: false,
      viewportWidth: typeof window !== "undefined" ? window.innerWidth : 390,
    }),
    [drawerState, overlayActive],
  );

  const canStartPull = useCallback(
    (target: Element, clientX: number, clientY: number): boolean => {
      if (guardsBlock()) return false;
      const scrollEl = scrollRef.current;
      if (!scrollEl) return false;
      if (!scrollEl.contains(target)) return false;
      const scrollport = resolvePullScrollport(target, scrollEl);
      if (!isScrollAtTop(scrollport.scrollTop)) return false;
      const edgeZone = resolveActivationZonePx(
        typeof window !== "undefined" ? window.innerWidth : 390,
        0,
      );
      if (clientX <= edgeZone) return false;
      if (!canPullToRefreshClaimGesture(buildGestureContext(target, clientX, clientY))) {
        return false;
      }
      return true;
    },
    [buildGestureContext, guardsBlock, scrollRef],
  );

  const onGestureStart = useCallback(
    (e: PointerEvent) => {
      if (guardsBlock()) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!canStartPull(target, e.clientX, e.clientY)) return;
      const scrollEl = scrollRef.current;
      const scrollport =
        scrollEl != null ? resolvePullScrollport(target, scrollEl) : null;
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        active: true,
        pulling: false,
        scrollport,
      };
    },
    [canStartPull, guardsBlock],
  );

  const onGestureMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag.active) return;
      const scrollport = drag.scrollport ?? scrollRef.current;
      if (!scrollport || !isScrollAtTop(scrollport.scrollTop)) {
        resetPull();
        return;
      }

      const deltaX = e.clientX - drag.startX;
      const deltaY = e.clientY - drag.startY;

      if (!drag.pulling) {
        if (deltaY < ACTIVATION_PX || !isVerticalPullGesture(deltaX, deltaY)) return;
        drag.pulling = true;
        setPhaseSafe("pulling");
      }

      if (deltaY <= 0) {
        resetPull();
        return;
      }

      e.preventDefault();

      const banded = rubberBandPullY(deltaY);
      pullPxRef.current = banded;
      setPullPx(banded);
      applyTransform(banded);
    },
    [applyTransform, resetPull, scrollRef, setPhaseSafe],
  );

  const onGestureEnd = useCallback(() => {
    const drag = dragRef.current;
    if (!drag.active) return;

    const currentPull = pullPxRef.current;
    const shouldRefresh = drag.pulling && shouldCommitPullToRefresh(currentPull);

    dragRef.current = { startX: 0, startY: 0, active: false, pulling: false, scrollport: null };

    if (!shouldRefresh) {
      resetPull();
      return;
    }

    if (prefersReducedMotion()) {
      runRefresh();
      return;
    }

    const node = contentRef.current;
    if (node) {
      node.style.transition = "transform 180ms ease-out";
      node.style.transform = "translate3d(0, 0, 0)";
    }
    pullPxRef.current = 0;
    setPullPx(0);
    runRefresh();
  }, [contentRef, resetPull, runRefresh]);

  usePointerGesture({
    enabled,
    onGestureStart,
    onGestureMove,
    onGestureEnd,
    onGestureCancel: resetPull,
  });

  useEffect(() => {
    if (!enabled && phaseRef.current === "idle") resetPull();
  }, [enabled, resetPull]);

  useEffect(() => {
    if (!enabled) return;
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const node = contentRef.current;
      if (!node?.style.transform || node.style.transform === "none") return;
      resetPull();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [enabled, contentRef, resetPull]);

  return {
    phase,
    pullPx,
    progress: pullProgress(pullPx),
  };
}
