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

function readSafeAreaLeftPx(): number {
  if (typeof document === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;left:0;top:0;padding-left:env(safe-area-inset-left);visibility:hidden;pointer-events:none";
  document.documentElement.appendChild(probe);
  const px = probe.offsetWidth;
  probe.remove();
  return px;
}

function isHorizontallyScrollable(el: Element | null): boolean {
  let node = el;
  while (node instanceof HTMLElement) {
    const style = getComputedStyle(node);
    const overflowX = style.overflowX;
    if (
      (overflowX === "auto" || overflowX === "scroll") &&
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
 * Swipe orizzontale dal bordo sinistro per aprire drawer nav (mobile).
 * ponytail: soglia fissa 30% larghezza; upgrade = velocity-based open.
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
  });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const panelWidthGestureRef = useRef(DEFAULT_PANEL_WIDTH);
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
    dragRef.current = { startX: 0, startY: 0, active: false, dragging: false, lastDeltaX: 0 };
    edgeActiveRef.current = false;
    setEdgeActive(false);
    setIsDragging(false);
    setDragX(0);
    setIsSnapping(false);
    setSnapTarget(null);
  }, []);

  const finishCommit = useCallback(() => {
    resetDrag();
    onCommit();
  }, [onCommit, resetDrag]);

  const finishCancel = useCallback(() => {
    resetDrag();
    onCancel();
  }, [onCancel, resetDrag]);

  useEffect(() => {
    if (!enabled) return;

    const edgeZone = resolveEdgeZonePx(readSafeAreaLeftPx());

    function onTouchStart(e: TouchEvent) {
      if (edgeActiveRef.current || isSnapping) return;
      const touch = e.touches[0];
      if (!touch) return;
      if (touch.clientX > edgeZone) return;
      const target = e.target;
      if (target instanceof Element && isHorizontallyScrollable(target)) return;

      dragRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        active: true,
        dragging: false,
        lastDeltaX: 0,
      };
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
      const nextX = Math.max(0, Math.min(width, deltaX));
      dragRef.current.lastDeltaX = nextX;
      setDragX(nextX);
    }

    function onTouchEnd() {
      if (!dragRef.current.active) return;
      const width = panelWidthGestureRef.current;
      const currentX = dragRef.current.dragging ? dragRef.current.lastDeltaX : 0;
      const shouldCommit = dragRef.current.dragging && shouldCommitEdgeOpen(currentX, width);

      dragRef.current = { startX: 0, startY: 0, active: false, dragging: false, lastDeltaX: 0 };
      setIsDragging(false);

      if (!edgeActiveRef.current) return;

      if (prefersReducedMotion()) {
        if (shouldCommit) finishCommit();
        else finishCancel();
        return;
      }

      if (shouldCommit) {
        setIsSnapping(true);
        setSnapTarget("open");
        setDragX(width);
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
    if (!edgeActive) return;
    const w = panelRef.current?.offsetWidth;
    if (!w) return;
    panelWidthGestureRef.current = w;
    setPanelWidth(w);
  }, [edgeActive, dragX, isSnapping]);

  useEffect(() => {
    if (!isSnapping || !snapTarget) return;
    const el = panelRef.current;
    if (!el) {
      if (snapTarget === "open") finishCommit();
      else finishCancel();
      return;
    }

    function onTransitionEnd(e: TransitionEvent) {
      if (e.target !== el || e.propertyName !== "transform") return;
      if (snapTarget === "open") finishCommit();
      else finishCancel();
    }

    el.addEventListener("transitionend", onTransitionEnd);
    const fallback = window.setTimeout(() => {
      if (snapTarget === "open") finishCommit();
      else finishCancel();
    }, SNAP_MS + 80);

    return () => {
      el.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(fallback);
    };
  }, [finishCancel, finishCommit, isSnapping, snapTarget]);

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
