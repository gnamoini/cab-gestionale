"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const ACTIVATION_PX = 8;
const OPEN_RATIO = 0.3;
const EDGE_ZONE_MIN_PX = 20;
const DEFAULT_PANEL_WIDTH = 312;
const SNAP_MS = 240;

type DragState = {
  startX: number;
  startY: number;
  active: boolean;
  dragging: boolean;
  lastDeltaX: number;
  rawDeltaX: number;
};

export function resolveEdgeZonePx(safeAreaLeftPx = 0): number {
  return Math.max(EDGE_ZONE_MIN_PX, safeAreaLeftPx);
}

export function panelTransformForEdgeOpen(dragX: number, panelWidth: number): string {
  return `translateX(${-panelWidth + dragX}px)`;
}

export function backdropOpacityForEdgeOpen(dragX: number, panelWidth: number): number {
  return Math.max(0, Math.min(1, dragX / panelWidth));
}

export function shouldCommitEdgeOpen(dragX: number, panelWidth: number): boolean {
  return dragX >= panelWidth * OPEN_RATIO;
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

/**
 * Target touch che non deve avviare l'apertura menu (scroll orizzontale, opt-out esplicito).
 */
export function isSwipeNavGestureBlockedTarget(el: Element | null): boolean {
  if (el == null || typeof HTMLElement === "undefined") return false;
  let node: Element | null = el;
  while (node instanceof HTMLElement) {
    if (node.dataset.cabSwipeNavIgnore !== undefined) return true;
    const style = getComputedStyle(node);
    const touchAction = style.touchAction;
    if (touchAction.includes("pan-x") && !touchAction.includes("pan-y")) return true;
    const overflowX = style.overflowX;
    if (
      (overflowX === "auto" || overflowX === "scroll" || overflowX === "overlay") &&
      node.scrollWidth > node.clientWidth + 1
    ) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export type UseSwipeFromEdgeToOpenOptions = {
  enabled: boolean;
  /** Larghezza pannello nota (es. da ref montato); fallback DEFAULT_PANEL_WIDTH. */
  panelWidth?: number;
  onBegin: () => void;
  onCommit: () => void;
  onCancel: () => void;
};

/**
 * Swipe orizzontale verso destra per aprire drawer nav (mobile).
 * ponytail: soglia fissa 30% larghezza; upgrade = velocity-based open.
 * Parte da tutta la pagina, tranne target con scroll orizzontale (`isSwipeNavGestureBlockedTarget`).
 */
export function useSwipeFromEdgeToOpen({
  enabled,
  panelWidth: panelWidthProp,
  onBegin,
  onCommit,
  onCancel,
}: UseSwipeFromEdgeToOpenOptions) {
  const dragRef = useRef<DragState>({
    startX: 0,
    startY: 0,
    active: false,
    dragging: false,
    lastDeltaX: 0,
    rawDeltaX: 0,
  });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const panelWidthGestureRef = useRef(DEFAULT_PANEL_WIDTH);
  const panelWidthLockedRef = useRef(false);
  const peakDragXRef = useRef(0);
  const edgeActiveRef = useRef(false);
  const [edgeActive, setEdgeActive] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [snapTarget, setSnapTarget] = useState<"open" | "closed" | null>(null);

  const getPanelWidth = useCallback(() => {
    return panelRef.current?.offsetWidth ?? panelWidthProp ?? DEFAULT_PANEL_WIDTH;
  }, [panelWidthProp]);

  const resetDrag = useCallback(() => {
    dragRef.current = {
      startX: 0,
      startY: 0,
      active: false,
      dragging: false,
      lastDeltaX: 0,
      rawDeltaX: 0,
    };
    edgeActiveRef.current = false;
    panelWidthLockedRef.current = false;
    peakDragXRef.current = 0;
    setEdgeActive(false);
    setIsDragging(false);
    setDragX(0);
    setIsSnapping(false);
    setSnapTarget(null);
  }, []);

  const finishCommit = useCallback(() => {
    onCommit();
    requestAnimationFrame(() => {
      resetDrag();
    });
  }, [onCommit, resetDrag]);

  const finishCancel = useCallback(() => {
    resetDrag();
    onCancel();
  }, [onCancel, resetDrag]);

  useEffect(() => {
    const keepListening =
      enabled || edgeActiveRef.current || dragRef.current.active || isSnapping;
    if (!keepListening) return;

    function onTouchStart(e: TouchEvent) {
      if (edgeActiveRef.current || isSnapping) return;
      const touch = e.touches[0];
      if (!touch) return;
      const target = e.target;
      if (target instanceof Element && isSwipeNavGestureBlockedTarget(target)) return;

      dragRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        active: true,
        dragging: false,
        lastDeltaX: 0,
        rawDeltaX: 0,
      };
      peakDragXRef.current = 0;
    }

    function onTouchMove(e: TouchEvent) {
      if (!dragRef.current.active) return;
      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - dragRef.current.startX;
      const deltaY = touch.clientY - dragRef.current.startY;

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
          setPanelWidth(width);
          edgeActiveRef.current = true;
          setEdgeActive(true);
          onBegin();
        }
      }

      e.preventDefault();
      const width = panelWidthGestureRef.current;
      dragRef.current.rawDeltaX = deltaX;
      const nextX = clampEdgeOpenDragX(deltaX, width);
      dragRef.current.lastDeltaX = nextX;
      peakDragXRef.current = Math.max(peakDragXRef.current, nextX);
      setDragX(nextX);
    }

    function onTouchEnd() {
      if (!dragRef.current.active) return;
      const width = panelWidthGestureRef.current;
      const currentX = dragRef.current.dragging ? dragRef.current.lastDeltaX : 0;
      const peakX = peakDragXRef.current;
      const shouldCommit =
        dragRef.current.dragging && shouldCommitEdgeOpenGesture(currentX, peakX, width);

      dragRef.current = {
        startX: 0,
        startY: 0,
        active: false,
        dragging: false,
        lastDeltaX: 0,
        rawDeltaX: 0,
      };
      setIsDragging(false);

      if (!edgeActiveRef.current) return;

      if (shouldCommit) {
        finishCommit();
        return;
      }

      if (prefersReducedMotion()) {
        finishCancel();
        return;
      }

      if (currentX > 0) {
        setIsSnapping(true);
        setSnapTarget("closed");
        setDragX(0);
        return;
      }

      finishCancel();
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, finishCancel, finishCommit, getPanelWidth, isSnapping, onBegin]);

  useLayoutEffect(() => {
    if (!edgeActive || panelWidthLockedRef.current) return;
    const w = panelRef.current?.offsetWidth ?? panelWidthProp;
    if (!w) return;
    panelWidthGestureRef.current = w;
    panelWidthLockedRef.current = true;
    setPanelWidth(w);
    const nextX = clampEdgeOpenDragX(dragRef.current.rawDeltaX, w);
    dragRef.current.lastDeltaX = nextX;
    peakDragXRef.current = Math.max(peakDragXRef.current, nextX);
    setDragX(nextX);
  }, [edgeActive, panelWidthProp]);

  useEffect(() => {
    if (!isSnapping || snapTarget !== "closed") return;
    const el = panelRef.current;
    if (!el) {
      finishCancel();
      return;
    }

    function onTransitionEnd(e: TransitionEvent) {
      if (e.target !== el || e.propertyName !== "transform") return;
      finishCancel();
    }

    el.addEventListener("transitionend", onTransitionEnd);
    const fallback = window.setTimeout(() => {
      finishCancel();
    }, SNAP_MS + 80);

    return () => {
      el.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(fallback);
    };
  }, [finishCancel, isSnapping, snapTarget]);

  const panelStyle =
    dragX > 0 || isSnapping
      ? { transform: panelTransformForEdgeOpen(dragX, panelWidth) }
      : undefined;

  const panelClassName = isDragging
    ? "cab-nav-drawer-dragging cab-nav-drawer-edge-opening"
    : isSnapping
      ? "cab-nav-drawer-snap-back cab-nav-drawer-edge-opening"
      : undefined;

  const backdropOpacity = dragX > 0 ? backdropOpacityForEdgeOpen(dragX, panelWidth) : undefined;

  return {
    panelRef,
    isEdgeOpening: edgeActive || dragX > 0 || isSnapping,
    dragX,
    isDragging,
    isSnapping,
    panelProps: {
      style: panelStyle,
      className: panelClassName,
    },
    backdropProps: {
      style: backdropOpacity !== undefined ? { opacity: backdropOpacity } : undefined,
      className:
        isDragging || isSnapping ? "cab-nav-drawer-backdrop-dragging" : undefined,
    },
    resetDrag,
  };
}
