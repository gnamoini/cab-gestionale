"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { NavDrawerState } from "@/lib/ui/mobile-nav-drawer-contract";
import {
  NAV_DRAWER_ANIMATION_MS,
  NAV_DRAWER_EDGE_DRAG_IDLE_MS,
  resolveActivationZonePx,
  rubberBandDragX,
  shouldCommitGesture,
} from "@/lib/ui/mobile-nav-drawer-contract";
import { getNavDrawerEdgeSwipeBlockReason, type GestureContext } from "@/lib/ui/gesture-arbitration";
import { deriveMainInert } from "@/lib/ui/mobile-nav-drawer-machine";
import { logDrawerGestureDebug, recordDrawerTelemetry } from "@/lib/ui/mobile-nav-drawer-telemetry";
import { armSelectorGhostClickGuard } from "@/lib/selector-interaction/suppress-selector-ghost-click";
import {
  applyCompositorTransform,
  clearCompositorStyles,
  usePointerGesture,
} from "@/lib/ui/use-pointer-gesture";

const ACTIVATION_PX = 8;
const EDGE_ZONE_VERTICAL_SLOP_FACTOR = 0.75;
const DEFAULT_PANEL_WIDTH = 312;

type DragState = {
  startX: number;
  startY: number;
  prevClientX: number;
  active: boolean;
  dragging: boolean;
  lastDeltaX: number;
  lastTime: number;
  velocityX: number;
};

export function resolveEdgeZonePx(safeAreaLeftPx = 0, viewportWidth = 390): number {
  return resolveActivationZonePx(viewportWidth, safeAreaLeftPx);
}

export function panelTransformForEdgeOpen(dragX: number, panelWidth: number): string {
  return `translate3d(${-panelWidth + dragX}px, 0, 0)`;
}

export function backdropOpacityForEdgeOpen(dragX: number, panelWidth: number): number {
  return Math.max(0, Math.min(1, dragX / panelWidth));
}

export function shouldCommitEdgeOpen(dragX: number, panelWidth: number): boolean {
  return dragX >= panelWidth * 0.3;
}

export function peakEdgeOpenDragX(currentX: number, peakX: number): number {
  return Math.max(currentX, peakX);
}

export function shouldCommitEdgeOpenGesture(currentX: number, peakX: number, panelWidth: number): boolean {
  return shouldCommitEdgeOpen(peakEdgeOpenDragX(currentX, peakX), panelWidth);
}

export function clampEdgeOpenDragX(rawDeltaX: number, panelWidth: number): number {
  return Math.max(0, Math.min(panelWidth, rawDeltaX));
}

export function peakGestureVelocity(current: number, peak: number): number {
  return Math.max(current, peak);
}

/** Edge zone: 25% vertical tolerance. Outside edge zone: horizontal must dominate. */
export function shouldActivateEdgeOpenDrag(
  inEdgeZone: boolean,
  deltaX: number,
  deltaY: number,
  activationPx = ACTIVATION_PX,
): boolean {
  if (Math.abs(deltaX) < activationPx && Math.abs(deltaY) < activationPx) return false;
  if (inEdgeZone) {
    return deltaX > activationPx && deltaX > Math.abs(deltaY) * EDGE_ZONE_VERTICAL_SLOP_FACTOR;
  }
  if (Math.abs(deltaY) > Math.abs(deltaX)) return false;
  return deltaX > activationPx;
}

export { isSwipeNavGestureBlockedTarget } from "@/lib/ui/gesture-arbitration";

export type UseSwipeFromEdgeToOpenOptions = {
  enabled: boolean;
  drawerState: NavDrawerState;
  drawerMounted?: boolean;
  overlayActive: boolean;
  panelWidth?: number;
  onBegin: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onSnapClosed?: () => void;
  onPointerCancel: () => void;
  onDragProgress?: () => void;
};

export function useSwipeFromEdgeToOpen({
  enabled,
  drawerState,
  drawerMounted = false,
  overlayActive,
  panelWidth: panelWidthProp,
  onBegin,
  onCommit,
  onCancel,
  onSnapClosed,
  onPointerCancel,
  onDragProgress,
}: UseSwipeFromEdgeToOpenOptions) {
  const dragRef = useRef<DragState>({
    startX: 0,
    startY: 0,
    prevClientX: 0,
    active: false,
    dragging: false,
    lastDeltaX: 0,
    lastTime: 0,
    velocityX: 0,
  });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLElement | null>(null);
  const panelWidthGestureRef = useRef(DEFAULT_PANEL_WIDTH);
  const peakDragXRef = useRef(0);
  const peakVelocityXRef = useRef(0);
  const edgeActiveRef = useRef(false);
  const pointerDownInEdgeZoneRef = useRef(false);
  const capturedPointerIdRef = useRef<number | null>(null);
  const lastMoveAtRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingTransformRef = useRef({ dragX: 0, panelWidth: DEFAULT_PANEL_WIDTH });
  const [edgeActive, setEdgeActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);

  const getPanelWidth = useCallback(() => {
    return panelRef.current?.offsetWidth ?? panelWidthProp ?? DEFAULT_PANEL_WIDTH;
  }, [panelWidthProp]);

  const flushTransform = useCallback(() => {
    rafRef.current = null;
    const { dragX, panelWidth } = pendingTransformRef.current;
    applyCompositorTransform(
      panelRef.current,
      backdropRef.current,
      panelTransformForEdgeOpen(dragX, panelWidth),
      backdropOpacityForEdgeOpen(dragX, panelWidth),
    );
  }, []);

  const scheduleTransform = useCallback(
    (dragX: number, panelWidth: number) => {
      pendingTransformRef.current = { dragX, panelWidth };
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(flushTransform);
    },
    [flushTransform],
  );

  const releasePointer = useCallback(() => {
    const id = capturedPointerIdRef.current;
    if (id == null) return;
    capturedPointerIdRef.current = null;
    try {
      if (document.body.hasPointerCapture(id)) {
        document.body.releasePointerCapture(id);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const capturePointer = useCallback((e: PointerEvent) => {
    try {
      document.body.setPointerCapture(e.pointerId);
      capturedPointerIdRef.current = e.pointerId;
    } catch {
      /* ignore */
    }
  }, []);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current != null) {
      clearInterval(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const resetDrag = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    clearIdleTimer();
    releasePointer();
    dragRef.current = {
      startX: 0,
      startY: 0,
      prevClientX: 0,
      active: false,
      dragging: false,
      lastDeltaX: 0,
      lastTime: 0,
      velocityX: 0,
    };
    edgeActiveRef.current = false;
    peakDragXRef.current = 0;
    peakVelocityXRef.current = 0;
    pointerDownInEdgeZoneRef.current = false;
    setEdgeActive(false);
    setIsDragging(false);
    setIsSnapping(false);
    clearCompositorStyles(panelRef.current, backdropRef.current);
  }, [clearIdleTimer, releasePointer]);

  const finishCommit = useCallback(() => {
    releasePointer();
    armSelectorGhostClickGuard();
    onCommit();
    requestAnimationFrame(() => resetDrag());
  }, [onCommit, releasePointer, resetDrag]);

  const finishCancel = useCallback(
    (visuallyClosed = false) => {
      releasePointer();
      if (visuallyClosed) {
        onSnapClosed?.();
      }
      onCancel();
    },
    [onCancel, onSnapClosed, releasePointer],
  );

  const beginSnapBack = useCallback(() => {
    releasePointer();
    dragRef.current = {
      startX: 0,
      startY: 0,
      prevClientX: 0,
      active: false,
      dragging: false,
      lastDeltaX: 0,
      lastTime: 0,
      velocityX: 0,
    };
    setIsDragging(false);
    setIsSnapping(true);
  }, [releasePointer]);

  const abortEdgeDrag = useCallback(() => {
    if (!edgeActiveRef.current) return;
    const width = panelWidthGestureRef.current;
    const currentX = dragRef.current.lastDeltaX;
    clearIdleTimer();

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (currentX > 0 && !reducedMotion) {
      beginSnapBack();
      return;
    }

    dragRef.current = {
      startX: 0,
      startY: 0,
      prevClientX: 0,
      active: false,
      dragging: false,
      lastDeltaX: 0,
      lastTime: 0,
      velocityX: 0,
    };
    setIsDragging(false);
    onPointerCancel();
    finishCancel(currentX > 0 && reducedMotion);
  }, [beginSnapBack, clearIdleTimer, finishCancel, onPointerCancel]);

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

  const logGestureDebug = useCallback(
    (phase: string, extra?: Partial<Parameters<typeof logDrawerGestureDebug>[0]>) => {
      logDrawerGestureDebug({
        state: drawerState,
        mounted: drawerMounted,
        mainInert: deriveMainInert(drawerState),
        phase,
        ...extra,
      });
    },
    [drawerMounted, drawerState],
  );

  const onGestureStart = useCallback(
    (e: PointerEvent) => {
      if (edgeActiveRef.current || isSnapping) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const ctx = buildGestureContext(target, e.clientX, e.clientY);
      const blockedReason = getNavDrawerEdgeSwipeBlockReason(ctx);
      if (blockedReason != null) {
        if (e.clientX <= resolveActivationZonePx(ctx.viewportWidth, ctx.safeAreaLeftPx ?? 0)) {
          logGestureDebug("pointerdown_blocked", {
            pointerId: e.pointerId,
            edgeStart: e.clientX,
            target: target.tagName,
            blockedReason,
          });
        }
        return;
      }

      pointerDownInEdgeZoneRef.current = true;
      logGestureDebug("pointerdown_edge", {
        pointerId: e.pointerId,
        edgeStart: e.clientX,
        target: target.tagName,
      });

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        prevClientX: e.clientX,
        active: true,
        dragging: false,
        lastDeltaX: 0,
        lastTime: e.timeStamp,
        velocityX: 0,
      };
      peakDragXRef.current = 0;
      peakVelocityXRef.current = 0;
      lastMoveAtRef.current = Date.now();
    },
    [buildGestureContext, isSnapping, logGestureDebug],
  );

  const onGestureMove = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current.active) return;

      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      const dt = Math.max(1, e.timeStamp - dragRef.current.lastTime);
      const instantVelocity = (e.clientX - dragRef.current.prevClientX) / dt;
      dragRef.current.velocityX = (e.clientX - dragRef.current.startX) / dt;
      dragRef.current.prevClientX = e.clientX;
      dragRef.current.lastTime = e.timeStamp;
      peakVelocityXRef.current = peakGestureVelocity(instantVelocity, peakVelocityXRef.current);
      lastMoveAtRef.current = Date.now();

      if (!dragRef.current.dragging) {
        if (!shouldActivateEdgeOpenDrag(pointerDownInEdgeZoneRef.current, deltaX, deltaY)) {
          if (
            Math.abs(deltaX) >= ACTIVATION_PX ||
            Math.abs(deltaY) >= ACTIVATION_PX
          ) {
            dragRef.current.active = false;
            pointerDownInEdgeZoneRef.current = false;
          }
          return;
        }
        dragRef.current.dragging = true;
        setIsDragging(true);
        if (!edgeActiveRef.current) {
          const width = getPanelWidth();
          panelWidthGestureRef.current = width;
          edgeActiveRef.current = true;
          setEdgeActive(true);
          capturePointer(e);
          logGestureDebug("edge_drag_start", { pointerId: e.pointerId });
          onBegin();
        }
      }

      e.preventDefault();
      const width = panelWidthGestureRef.current;
      const nextX = clampEdgeOpenDragX(deltaX, width);
      const rubber = rubberBandDragX(nextX, width);
      dragRef.current.lastDeltaX = nextX;
      peakDragXRef.current = Math.max(peakDragXRef.current, nextX);
      onDragProgress?.();
      scheduleTransform(rubber, width);
    },
    [capturePointer, getPanelWidth, logGestureDebug, onBegin, onDragProgress, scheduleTransform],
  );

  const onGestureEnd = useCallback(
    (_e: PointerEvent) => {
      if (!dragRef.current.active) return;
      clearIdleTimer();
      const width = panelWidthGestureRef.current;
      const currentX = dragRef.current.dragging ? dragRef.current.lastDeltaX : 0;
      const peakX = peakDragXRef.current;
      const velocity = peakGestureVelocity(dragRef.current.velocityX, peakVelocityXRef.current);
      const shouldCommit =
        dragRef.current.dragging &&
        (shouldCommitGesture(peakX, width, velocity, "open") ||
          shouldCommitEdgeOpenGesture(currentX, peakX, width));

      dragRef.current = {
        startX: 0,
        startY: 0,
        prevClientX: 0,
        active: false,
        dragging: false,
        lastDeltaX: 0,
        lastTime: 0,
        velocityX: 0,
      };
      setIsDragging(false);
      pointerDownInEdgeZoneRef.current = false;

      if (!edgeActiveRef.current) return;

      if (shouldCommit) {
        if (shouldCommitGesture(peakX, width, velocity, "open") && !shouldCommitEdgeOpen(peakX, width)) {
          recordDrawerTelemetry("drawer_velocity_commit", { dir: "open" });
        }
        logGestureDebug("edge_drag_commit", { pointerId: _e.pointerId });
        finishCommit();
        return;
      }

      const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) {
        finishCancel(true);
        return;
      }

      if (currentX > 0) {
        logGestureDebug("edge_drag_snap_back", { pointerId: _e.pointerId });
        beginSnapBack();
        return;
      }

      logGestureDebug("edge_drag_cancel", { pointerId: _e.pointerId });
      finishCancel(false);
    },
    [beginSnapBack, clearIdleTimer, finishCancel, finishCommit, logGestureDebug],
  );

  const onGestureCancel = useCallback(() => {
    if (!edgeActiveRef.current) return;
    clearIdleTimer();
    logGestureDebug("pointercancel");
    const currentX = dragRef.current.lastDeltaX;
    if (currentX > 0) {
      beginSnapBack();
      return;
    }
    onPointerCancel();
    finishCancel();
  }, [beginSnapBack, clearIdleTimer, finishCancel, logGestureDebug, onPointerCancel]);

  usePointerGesture({
    enabled: enabled || edgeActive,
    onGestureStart,
    onGestureMove,
    onGestureEnd,
    onGestureCancel,
  });

  useLayoutEffect(() => {
    if (!edgeActive) return;
    const w = panelRef.current?.offsetWidth ?? panelWidthProp;
    if (!w) return;
    panelWidthGestureRef.current = w;
    flushTransform();
  }, [edgeActive, flushTransform, panelWidthProp]);

  useLayoutEffect(() => {
    if (!isSnapping) return;
    const width = panelWidthGestureRef.current;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scheduleTransform(0, width));
    });
  }, [isSnapping, scheduleTransform]);

  useEffect(() => {
    if (!isSnapping) return;
    const el = panelRef.current;
    if (!el) {
      finishCancel();
      return;
    }

    function onTransitionEnd(e: TransitionEvent) {
      if (e.target !== el || e.propertyName !== "transform") return;
      finishCancel(true);
    }

    el.addEventListener("transitionend", onTransitionEnd);
    const fallback = window.setTimeout(() => finishCancel(true), NAV_DRAWER_ANIMATION_MS + 80);

    return () => {
      el.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(fallback);
    };
  }, [finishCancel, isSnapping]);

  useEffect(() => {
    if ((drawerState === "OPENING" || drawerState === "OPEN") && (edgeActiveRef.current || isSnapping)) {
      resetDrag();
    }
  }, [drawerState, isSnapping, resetDrag]);

  useEffect(() => {
    if (!edgeActive || !isDragging) {
      clearIdleTimer();
      return;
    }

    idleTimerRef.current = setInterval(() => {
      if (!edgeActiveRef.current || !dragRef.current.dragging) return;
      if (Date.now() - lastMoveAtRef.current < NAV_DRAWER_EDGE_DRAG_IDLE_MS) return;
      recordDrawerTelemetry("drawer_pointer_cancel");
      abortEdgeDrag();
    }, 100);

    return clearIdleTimer;
  }, [abortEdgeDrag, clearIdleTimer, edgeActive, isDragging]);

  useEffect(() => {
    if (!edgeActive) return;

    function onLostPointerCapture(e: PointerEvent) {
      // ponytail: ignora bubble dai figli quando body acquisisce capture al drag start
      if (e.target !== document.body) return;
      if (capturedPointerIdRef.current !== e.pointerId) return;
      capturedPointerIdRef.current = null;
      if (!dragRef.current.active && !dragRef.current.dragging) return;
      recordDrawerTelemetry("drawer_pointer_cancel");
      abortEdgeDrag();
    }

    document.body.addEventListener("lostpointercapture", onLostPointerCapture);
    return () => document.body.removeEventListener("lostpointercapture", onLostPointerCapture);
  }, [abortEdgeDrag, edgeActive]);

  const panelClassName = isDragging
    ? "cab-nav-drawer-dragging cab-nav-drawer-edge-opening"
    : isSnapping
      ? "cab-nav-drawer-snap-back cab-nav-drawer-edge-opening"
      : undefined;

  const panelStyle: CSSProperties | undefined = isSnapping
    ? { transform: panelTransformForEdgeOpen(0, panelWidthGestureRef.current) }
    : undefined;

  return {
    panelRef,
    backdropRef,
    isEdgeOpening: edgeActive || isSnapping,
    isDragging,
    isSnapping,
    panelProps: {
      className: panelClassName,
      style: panelStyle,
    },
    backdropProps: {
      className: isDragging || isSnapping ? "cab-nav-drawer-backdrop-dragging" : undefined,
    },
    resetDrag,
  };
}
