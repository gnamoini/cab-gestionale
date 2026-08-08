"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { NavDrawerState } from "@/lib/ui/mobile-nav-drawer-contract";
import {
  NAV_DRAWER_ANIMATION_MS,
  NAV_DRAWER_EDGE_DRAG_IDLE_MS,
  NAV_DRAWER_GESTURE_START_PX,
  NAV_DRAWER_PANEL_ID,
  rubberBandDragX,
  shouldCommitGesture,
} from "@/lib/ui/mobile-nav-drawer-contract";
import {
  getNavDrawerEdgeSwipeBlockReason,
  shouldNavDrawerClaimDismiss,
  type GestureContext,
} from "@/lib/ui/gesture-arbitration";
import { deriveMainInert } from "@/lib/ui/mobile-nav-drawer-machine";
import { logDrawerGestureDebug, recordDrawerTelemetry } from "@/lib/ui/mobile-nav-drawer-telemetry";
import { armSelectorGhostClickGuard } from "@/lib/selector-interaction/suppress-selector-ghost-click";
import {
  backdropOpacityForClose,
  backdropOpacityForOpen,
  clampCloseDragX,
  clampOpenDragX,
  isInEdgeZone,
  panelTransformClose,
  panelTransformOpen,
  peakDragX,
  peakVelocity,
  readSafeAreaLeftPx,
  resolveEdgeZonePx,
  shouldActivateHorizontalDrag,
  shouldBlockGestureTarget,
  type GestureDirection,
} from "@/lib/ui/nav-drawer-gesture";
import {
  applyCompositorTransform,
  clearCompositorStyles,
  usePointerGesture,
} from "@/lib/ui/use-pointer-gesture";

const DEFAULT_PANEL_WIDTH = 312;

type DragKind = GestureDirection | null;

type DragState = {
  startX: number;
  startY: number;
  prevClientX: number;
  active: boolean;
  dragging: boolean;
  kind: DragKind;
  lastDeltaX: number;
  lastTime: number;
  velocityX: number;
  pointerDownInEdgeZone: boolean;
};

export type UseNavDrawerGestureOptions = {
  enabled: boolean;
  drawerState: NavDrawerState;
  drawerMounted?: boolean;
  overlayActive: boolean;
  canEdgeSwipe: boolean;
  canDismiss: boolean;
  panelWidth?: number;
  onEdgeDragStart: () => void;
  onEdgeDragCommit: () => void;
  onEdgeDragCancel: () => void;
  onEdgeSnapClosed?: () => void;
  onDismissDragStart: () => void;
  onDismissDragCommit: () => void;
  onDismissDragCancel: () => void;
  onPointerCancel: () => void;
  onDragProgress?: () => void;
};

export function useNavDrawerGesture({
  enabled,
  drawerState,
  drawerMounted = false,
  overlayActive,
  canEdgeSwipe,
  canDismiss,
  panelWidth: panelWidthProp,
  onEdgeDragStart,
  onEdgeDragCommit,
  onEdgeDragCancel,
  onEdgeSnapClosed,
  onDismissDragStart,
  onDismissDragCommit,
  onDismissDragCancel,
  onPointerCancel,
  onDragProgress,
}: UseNavDrawerGestureOptions) {
  const dragRef = useRef<DragState>({
    startX: 0,
    startY: 0,
    prevClientX: 0,
    active: false,
    dragging: false,
    kind: null,
    lastDeltaX: 0,
    lastTime: 0,
    velocityX: 0,
    pointerDownInEdgeZone: false,
  });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLElement | null>(null);
  const panelWidthGestureRef = useRef(DEFAULT_PANEL_WIDTH);
  const peakDragXRef = useRef(0);
  const peakVelocityXRef = useRef(0);
  const gestureActiveRef = useRef(false);
  const capturedPointerIdRef = useRef<number | null>(null);
  const lastMoveAtRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingTransformRef = useRef({
    dragX: 0,
    panelWidth: DEFAULT_PANEL_WIDTH,
    kind: null as DragKind,
  });
  const drawerStateRef = useRef(drawerState);
  const canEdgeSwipeRef = useRef(canEdgeSwipe);
  const canDismissRef = useRef(canDismiss);
  drawerStateRef.current = drawerState;
  canEdgeSwipeRef.current = canEdgeSwipe;
  canDismissRef.current = canDismiss;

  const [gestureActive, setGestureActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const snapTargetRef = useRef<"edge-cancel" | "dismiss-commit" | "dismiss-cancel" | null>(null);

  const getPanelWidth = useCallback(() => {
    return panelRef.current?.offsetWidth ?? panelWidthProp ?? DEFAULT_PANEL_WIDTH;
  }, [panelWidthProp]);

  const flushTransform = useCallback(() => {
    rafRef.current = null;
    const { dragX, panelWidth, kind } = pendingTransformRef.current;
    if (kind === "close") {
      applyCompositorTransform(
        panelRef.current,
        backdropRef.current,
        panelTransformClose(dragX),
        backdropOpacityForClose(dragX, panelWidth),
      );
      return;
    }
    applyCompositorTransform(
      panelRef.current,
      backdropRef.current,
      panelTransformOpen(dragX, panelWidth),
      backdropOpacityForOpen(dragX, panelWidth),
    );
  }, []);

  const scheduleTransform = useCallback(
    (dragX: number, panelWidth: number, kind: DragKind) => {
      pendingTransformRef.current = { dragX, panelWidth, kind };
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
      kind: null,
      lastDeltaX: 0,
      lastTime: 0,
      velocityX: 0,
      pointerDownInEdgeZone: false,
    };
    gestureActiveRef.current = false;
    peakDragXRef.current = 0;
    peakVelocityXRef.current = 0;
    setGestureActive(false);
    setIsDragging(false);
    setIsSnapping(false);
    snapTargetRef.current = null;
    clearCompositorStyles(panelRef.current, backdropRef.current);
  }, [clearIdleTimer, releasePointer]);

  const buildGestureContext = useCallback(
    (target: Element, clientX: number, clientY: number): GestureContext => ({
      target,
      clientX,
      clientY,
      drawerState: drawerStateRef.current,
      overlayActive,
      keyboardOpen: false,
      viewportWidth: typeof window !== "undefined" ? window.innerWidth : 390,
      safeAreaLeftPx: readSafeAreaLeftPx(),
    }),
    [overlayActive],
  );

  const logGestureDebug = useCallback(
    (phase: string, extra?: Partial<Parameters<typeof logDrawerGestureDebug>[0]>) => {
      logDrawerGestureDebug({
        state: drawerStateRef.current,
        mounted: drawerMounted,
        mainInert: deriveMainInert(drawerStateRef.current),
        phase,
        ...extra,
      });
    },
    [drawerMounted],
  );

  const beginSnapBack = useCallback(
    (target: "edge-cancel" | "dismiss-cancel") => {
      releasePointer();
      dragRef.current = {
        startX: 0,
        startY: 0,
        prevClientX: 0,
        active: false,
        dragging: false,
        kind: null,
        lastDeltaX: 0,
        lastTime: 0,
        velocityX: 0,
        pointerDownInEdgeZone: false,
      };
      setIsDragging(false);
      snapTargetRef.current = target;
      setIsSnapping(true);
    },
    [releasePointer],
  );

  const finishEdgeCommit = useCallback(() => {
    releasePointer();
    armSelectorGhostClickGuard();
    onEdgeDragCommit();
    requestAnimationFrame(() => resetDrag());
  }, [onEdgeDragCommit, releasePointer, resetDrag]);

  const finishEdgeCancel = useCallback(
    (visuallyClosed = false) => {
      releasePointer();
      if (visuallyClosed) {
        onEdgeSnapClosed?.();
      }
      onEdgeDragCancel();
    },
    [onEdgeDragCancel, onEdgeSnapClosed, releasePointer],
  );

  const finishDismissCommit = useCallback(() => {
    releasePointer();
    armSelectorGhostClickGuard();
    onDismissDragCommit();
  }, [onDismissDragCommit, releasePointer]);

  const finishDismissCancel = useCallback(() => {
    releasePointer();
    onDismissDragCancel();
  }, [onDismissDragCancel, releasePointer]);

  const abortGesture = useCallback(() => {
    if (!gestureActiveRef.current) return;
    const kind = dragRef.current.kind;
    const width = panelWidthGestureRef.current;
    const currentX = dragRef.current.lastDeltaX;
    clearIdleTimer();

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (currentX !== 0 && !reducedMotion && kind != null) {
      beginSnapBack(kind === "open" ? "edge-cancel" : "dismiss-cancel");
      return;
    }

    dragRef.current = {
      startX: 0,
      startY: 0,
      prevClientX: 0,
      active: false,
      dragging: false,
      kind: null,
      lastDeltaX: 0,
      lastTime: 0,
      velocityX: 0,
      pointerDownInEdgeZone: false,
    };
    setIsDragging(false);
    onPointerCancel();
    if (kind === "open") {
      finishEdgeCancel(currentX > 0 && reducedMotion);
    } else if (kind === "close") {
      finishDismissCancel();
    }
  }, [beginSnapBack, clearIdleTimer, finishDismissCancel, finishEdgeCancel, onPointerCancel]);

  const canStartOpenGesture = useCallback(
    (state: NavDrawerState) => state === "CLOSED" && canEdgeSwipeRef.current,
    [],
  );

  const canStartCloseGesture = useCallback(
    (state: NavDrawerState) => state === "OPEN" && canDismissRef.current,
    [],
  );

  const onGestureStart = useCallback(
    (e: PointerEvent) => {
      if (gestureActiveRef.current || isSnapping) return;
      const target = e.target;
      if (!(target instanceof Element)) return;

      const state = drawerStateRef.current;
      const safeLeft = readSafeAreaLeftPx();
      const zonePx = resolveEdgeZonePx({ safeAreaLeftPx: safeLeft });
      const inEdge = isInEdgeZone(e.clientX, zonePx);
      const ctx = buildGestureContext(target, e.clientX, e.clientY);

      if (canStartOpenGesture(state)) {
        const blockedReason = getNavDrawerEdgeSwipeBlockReason(ctx);
        if (blockedReason != null) return;
        if (!inEdge) return;

        dragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          prevClientX: e.clientX,
          active: true,
          dragging: false,
          kind: "open",
          lastDeltaX: 0,
          lastTime: e.timeStamp,
          velocityX: 0,
          pointerDownInEdgeZone: true,
        };
        peakDragXRef.current = 0;
        peakVelocityXRef.current = 0;
        lastMoveAtRef.current = Date.now();
        logGestureDebug("pointerdown_edge", { pointerId: e.pointerId, edgeStart: e.clientX });
        return;
      }

      if (canStartCloseGesture(state)) {
        if (!shouldNavDrawerClaimDismiss(ctx)) return;
        if (shouldBlockGestureTarget(target)) return;

        dragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          prevClientX: e.clientX,
          active: true,
          dragging: false,
          kind: "close",
          lastDeltaX: 0,
          lastTime: e.timeStamp,
          velocityX: 0,
          pointerDownInEdgeZone: false,
        };
        peakDragXRef.current = 0;
        peakVelocityXRef.current = 0;
        lastMoveAtRef.current = Date.now();
        logGestureDebug("pointerdown_panel", { pointerId: e.pointerId });
      }
    },
    [buildGestureContext, canStartCloseGesture, canStartOpenGesture, isSnapping, logGestureDebug],
  );

  const onGestureMove = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current.active) return;
      if (e.buttons === 0 && dragRef.current.dragging) return;

      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      const dt = Math.max(1, e.timeStamp - dragRef.current.lastTime);
      const instantVelocity = (e.clientX - dragRef.current.prevClientX) / dt;
      dragRef.current.velocityX = (e.clientX - dragRef.current.startX) / dt;
      dragRef.current.prevClientX = e.clientX;
      dragRef.current.lastTime = e.timeStamp;
      peakVelocityXRef.current = peakVelocity(instantVelocity, peakVelocityXRef.current);
      lastMoveAtRef.current = Date.now();

      const kind = dragRef.current.kind;
      if (kind == null) return;

      if (!dragRef.current.dragging) {
        const activated = shouldActivateHorizontalDrag(
          kind,
          dragRef.current.pointerDownInEdgeZone,
          deltaX,
          deltaY,
          NAV_DRAWER_GESTURE_START_PX,
        );
        if (!activated) {
          const intent =
            Math.abs(deltaX) >= NAV_DRAWER_GESTURE_START_PX ||
            Math.abs(deltaY) >= NAV_DRAWER_GESTURE_START_PX;
          if (intent) {
            dragRef.current.active = false;
            dragRef.current.kind = null;
          }
          return;
        }
        dragRef.current.dragging = true;
        setIsDragging(true);
        if (!gestureActiveRef.current) {
          const width = getPanelWidth();
          panelWidthGestureRef.current = width;
          gestureActiveRef.current = true;
          setGestureActive(true);
          capturePointer(e);
          if (kind === "open") {
            logGestureDebug("edge_drag_start", { pointerId: e.pointerId });
            onEdgeDragStart();
          } else {
            logGestureDebug("dismiss_drag_start", { pointerId: e.pointerId });
            onDismissDragStart();
          }
        }
      }

      e.preventDefault();
      const width = panelWidthGestureRef.current;
      if (kind === "open") {
        const nextX = clampOpenDragX(deltaX, width);
        const rubber = rubberBandDragX(nextX, width);
        dragRef.current.lastDeltaX = nextX;
        peakDragXRef.current = peakDragX(nextX, peakDragXRef.current);
        onDragProgress?.();
        scheduleTransform(rubber, width, "open");
        return;
      }

      const nextX = clampCloseDragX(deltaX, width);
      const rubber = rubberBandDragX(nextX, width);
      dragRef.current.lastDeltaX = nextX;
      peakDragXRef.current = peakDragX(-nextX, peakDragXRef.current);
      onDragProgress?.();
      scheduleTransform(rubber, width, "close");
    },
    [
      capturePointer,
      getPanelWidth,
      logGestureDebug,
      onDismissDragStart,
      onDragProgress,
      onEdgeDragStart,
      scheduleTransform,
    ],
  );

  const onGestureEnd = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current.active) return;
      clearIdleTimer();
      const width = panelWidthGestureRef.current;
      const kind = dragRef.current.kind;
      const wasDragging = dragRef.current.dragging;
      const currentX = wasDragging ? dragRef.current.lastDeltaX : 0;
      const peakX = peakDragXRef.current;
      const velocity = peakVelocity(dragRef.current.velocityX, peakVelocityXRef.current);

      dragRef.current = {
        startX: 0,
        startY: 0,
        prevClientX: 0,
        active: false,
        dragging: false,
        kind: null,
        lastDeltaX: 0,
        lastTime: 0,
        velocityX: 0,
        pointerDownInEdgeZone: false,
      };
      setIsDragging(false);

      if (!gestureActiveRef.current || kind == null) return;

      const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (kind === "open") {
        const shouldCommit =
          wasDragging && shouldCommitGesture(peakX, width, velocity, "open");

        if (shouldCommit) {
          if (shouldCommitGesture(peakX, width, velocity, "open") && peakX < width * 0.3) {
            recordDrawerTelemetry("drawer_velocity_commit", { dir: "open" });
          }
          logGestureDebug("edge_drag_commit", { pointerId: e.pointerId });
          finishEdgeCommit();
          return;
        }

        if (reducedMotion) {
          finishEdgeCancel(true);
          return;
        }
        if (currentX > 0) {
          logGestureDebug("edge_drag_snap_back", { pointerId: e.pointerId });
          beginSnapBack("edge-cancel");
          return;
        }
        logGestureDebug("edge_drag_cancel", { pointerId: e.pointerId });
        finishEdgeCancel(false);
        return;
      }

      const shouldDismiss =
        wasDragging && shouldCommitGesture(-currentX, width, velocity, "close");

      if (shouldDismiss) {
        if (shouldCommitGesture(-currentX, width, velocity, "close") && currentX > -width * 0.3) {
          recordDrawerTelemetry("drawer_velocity_commit", { dir: "close" });
        }
        snapTargetRef.current = "dismiss-commit";
        setIsSnapping(true);
        setIsDragging(false);
        if (reducedMotion) {
          finishDismissCommit();
        } else {
          scheduleTransform(-width, width, "close");
        }
        return;
      }

      if (currentX !== 0) {
        finishDismissCancel();
        beginSnapBack("dismiss-cancel");
        scheduleTransform(0, width, "close");
        return;
      }

      resetDrag();
    },
    [
      beginSnapBack,
      clearIdleTimer,
      finishDismissCancel,
      finishDismissCommit,
      finishEdgeCancel,
      finishEdgeCommit,
      logGestureDebug,
      resetDrag,
      scheduleTransform,
    ],
  );

  const onGestureCancel = useCallback(() => {
    if (!gestureActiveRef.current) return;
    clearIdleTimer();
    logGestureDebug("pointercancel");
    const kind = dragRef.current.kind;
    const currentX = dragRef.current.lastDeltaX;
    if (currentX !== 0 && kind != null) {
      beginSnapBack(kind === "open" ? "edge-cancel" : "dismiss-cancel");
      return;
    }
    onPointerCancel();
    if (kind === "open") finishEdgeCancel();
    else if (kind === "close") finishDismissCancel();
  }, [beginSnapBack, clearIdleTimer, finishDismissCancel, finishEdgeCancel, logGestureDebug, onPointerCancel]);

  usePointerGesture({
    enabled: enabled || gestureActive,
    onGestureStart,
    onGestureMove,
    onGestureEnd,
    onGestureCancel,
  });

  useLayoutEffect(() => {
    if (!gestureActive) return;
    const w = panelRef.current?.offsetWidth ?? panelWidthProp;
    if (!w) return;
    panelWidthGestureRef.current = w;
    flushTransform();
  }, [flushTransform, gestureActive, panelWidthProp]);

  useLayoutEffect(() => {
    if (!isSnapping || snapTargetRef.current == null) return;
    const width = panelWidthGestureRef.current;
    const target = snapTargetRef.current;
    const dragX =
      target === "edge-cancel" ? 0 : target === "dismiss-commit" ? -width : 0;
    const kind: DragKind = target === "edge-cancel" ? "open" : "close";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scheduleTransform(dragX, width, kind));
    });
  }, [isSnapping, scheduleTransform]);

  useEffect(() => {
    if (!isSnapping) return;
    const el = panelRef.current;
    const target = snapTargetRef.current;
    if (!el || target == null) {
      if (target === "edge-cancel") finishEdgeCancel(true);
      else if (target === "dismiss-commit") finishDismissCommit();
      else resetDrag();
      return;
    }

    function onTransitionEnd(ev: TransitionEvent) {
      if (ev.target !== el || ev.propertyName !== "transform") return;
      if (target === "edge-cancel") {
        finishEdgeCancel(true);
        return;
      }
      if (target === "dismiss-commit") {
        finishDismissCommit();
        return;
      }
      resetDrag();
    }

    el.addEventListener("transitionend", onTransitionEnd);
    const fallback = window.setTimeout(() => {
      if (target === "edge-cancel") finishEdgeCancel(true);
      else if (target === "dismiss-commit") finishDismissCommit();
      else resetDrag();
    }, NAV_DRAWER_ANIMATION_MS + 80);

    return () => {
      el.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(fallback);
    };
  }, [finishDismissCommit, finishEdgeCancel, isSnapping, resetDrag]);

  useEffect(() => {
    if ((drawerState === "OPENING" || drawerState === "OPEN") && (gestureActiveRef.current || isSnapping)) {
      resetDrag();
    }
  }, [drawerState, isSnapping, resetDrag]);

  useEffect(() => {
    if (!gestureActive || !isDragging) {
      clearIdleTimer();
      return;
    }

    idleTimerRef.current = setInterval(() => {
      if (!gestureActiveRef.current || !dragRef.current.dragging) return;
      if (Date.now() - lastMoveAtRef.current < NAV_DRAWER_EDGE_DRAG_IDLE_MS) return;
      recordDrawerTelemetry("drawer_pointer_cancel");
      abortGesture();
    }, 100);

    return clearIdleTimer;
  }, [abortGesture, clearIdleTimer, gestureActive, isDragging]);

  useEffect(() => {
    if (!gestureActive) return;

    function onLostPointerCapture(ev: PointerEvent) {
      if (ev.target !== document.body) return;
      if (capturedPointerIdRef.current !== ev.pointerId) return;
      capturedPointerIdRef.current = null;
      if (!dragRef.current.active && !dragRef.current.dragging) return;
      recordDrawerTelemetry("drawer_pointer_cancel");
      abortGesture();
    }

    document.body.addEventListener("lostpointercapture", onLostPointerCapture);
    return () => document.body.removeEventListener("lostpointercapture", onLostPointerCapture);
  }, [abortGesture, gestureActive]);

  const isEdgeOpening = gestureActive || (isSnapping && snapTargetRef.current === "edge-cancel");

  const panelClassName = isDragging
    ? `cab-nav-drawer-dragging${isEdgeOpening ? " cab-nav-drawer-edge-opening" : ""}`
    : isSnapping
      ? `cab-nav-drawer-snap-back${isEdgeOpening ? " cab-nav-drawer-edge-opening" : ""}`
      : undefined;

  const panelStyle: CSSProperties | undefined =
    isSnapping && snapTargetRef.current === "edge-cancel"
      ? { transform: panelTransformOpen(0, panelWidthGestureRef.current) }
      : isSnapping && snapTargetRef.current === "dismiss-commit"
        ? { transform: panelTransformClose(-panelWidthGestureRef.current) }
        : undefined;

  return {
    panelRef,
    backdropRef,
    isEdgeOpening,
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

export { NAV_DRAWER_PANEL_ID };
