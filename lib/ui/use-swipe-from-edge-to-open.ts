"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { NavDrawerState } from "@/lib/ui/mobile-nav-drawer-contract";
import {
  NAV_DRAWER_ANIMATION_MS,
  resolveActivationZonePx,
  rubberBandDragX,
  shouldCommitGesture,
} from "@/lib/ui/mobile-nav-drawer-contract";
import { shouldNavDrawerClaimEdgeSwipe, type GestureContext } from "@/lib/ui/gesture-arbitration";
import { recordDrawerTelemetry } from "@/lib/ui/mobile-nav-drawer-telemetry";
import {
  applyCompositorTransform,
  clearCompositorStyles,
  usePointerGesture,
} from "@/lib/ui/use-pointer-gesture";

const ACTIVATION_PX = 8;
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

export { isSwipeNavGestureBlockedTarget } from "@/lib/ui/gesture-arbitration";

export type UseSwipeFromEdgeToOpenOptions = {
  enabled: boolean;
  drawerState: NavDrawerState;
  overlayActive: boolean;
  panelWidth?: number;
  onBegin: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onSnapClosed?: () => void;
  onPointerCancel: () => void;
};

export function useSwipeFromEdgeToOpen({
  enabled,
  drawerState,
  overlayActive,
  panelWidth: panelWidthProp,
  onBegin,
  onCommit,
  onCancel,
  onSnapClosed,
  onPointerCancel,
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

  const resetDrag = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
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
    edgeActiveRef.current = false;
    peakDragXRef.current = 0;
    peakVelocityXRef.current = 0;
    setEdgeActive(false);
    setIsDragging(false);
    setIsSnapping(false);
    clearCompositorStyles(panelRef.current, backdropRef.current);
  }, []);

  const finishCommit = useCallback(() => {
    onCommit();
    requestAnimationFrame(() => resetDrag());
  }, [onCommit, resetDrag]);

  const finishCancel = useCallback(
    (visuallyClosed = false) => {
      if (visuallyClosed) {
        onSnapClosed?.();
      }
      onCancel();
    },
    [onCancel, onSnapClosed],
  );

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

  const onGestureStart = useCallback(
    (e: PointerEvent) => {
      if (edgeActiveRef.current || isSnapping) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (
        !shouldNavDrawerClaimEdgeSwipe(
          buildGestureContext(target, e.clientX, e.clientY),
        )
      ) {
        return;
      }

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
    },
    [buildGestureContext, isSnapping],
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

      if (!dragRef.current.dragging) {
        if (Math.abs(deltaX) < ACTIVATION_PX && Math.abs(deltaY) < ACTIVATION_PX) return;
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          dragRef.current.active = false;
          return;
        }
        if (deltaX <= 0) {
          dragRef.current.active = false;
          return;
        }
        dragRef.current.dragging = true;
        setIsDragging(true);
        if (!edgeActiveRef.current) {
          const width = getPanelWidth();
          panelWidthGestureRef.current = width;
          edgeActiveRef.current = true;
          setEdgeActive(true);
          onBegin();
        }
      }

      e.preventDefault();
      const width = panelWidthGestureRef.current;
      const nextX = clampEdgeOpenDragX(deltaX, width);
      const rubber = rubberBandDragX(nextX, width);
      dragRef.current.lastDeltaX = nextX;
      peakDragXRef.current = Math.max(peakDragXRef.current, nextX);
      scheduleTransform(rubber, width);
    },
    [getPanelWidth, onBegin, scheduleTransform],
  );

  const onGestureEnd = useCallback(
    (_e: PointerEvent) => {
      if (!dragRef.current.active) return;
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

      if (!edgeActiveRef.current) return;

      if (shouldCommit) {
        if (shouldCommitGesture(peakX, width, velocity, "open") && !shouldCommitEdgeOpen(peakX, width)) {
          recordDrawerTelemetry("drawer_velocity_commit", { dir: "open" });
        }
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
        setIsSnapping(true);
        scheduleTransform(0, width);
        return;
      }

      finishCancel(false);
    },
    [finishCancel, finishCommit, scheduleTransform],
  );

  const onGestureCancel = useCallback(() => {
    if (!edgeActiveRef.current) return;
    onPointerCancel();
    finishCancel();
  }, [finishCancel, onPointerCancel]);

  usePointerGesture({
    enabled: enabled || edgeActiveRef.current,
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
  }, [edgeActive, panelWidthProp]);

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

  const panelClassName = isDragging
    ? "cab-nav-drawer-dragging cab-nav-drawer-edge-opening"
    : isSnapping
      ? "cab-nav-drawer-snap-back cab-nav-drawer-edge-opening"
      : undefined;

  return {
    panelRef,
    backdropRef,
    isEdgeOpening: edgeActive || isSnapping,
    isDragging,
    isSnapping,
    panelProps: {
      className: panelClassName,
    },
    backdropProps: {
      className: isDragging || isSnapping ? "cab-nav-drawer-backdrop-dragging" : undefined,
    },
    resetDrag,
  };
}
