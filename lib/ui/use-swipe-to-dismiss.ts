"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type TouchEvent } from "react";

const ACTIVATION_PX = 8;
const DISMISS_RATIO = 0.3;
const DISMISS_MS = 240;

type DragState = {
  startX: number;
  startY: number;
  active: boolean;
  dragging: boolean;
  lastDeltaX: number;
};

/** Chiusura drawer: mai oltre la posizione aperta (bordo sinistro ancorato). */
export function clampSwipeDismissDragX(deltaX: number, panelWidth: number): number {
  return Math.min(0, Math.max(-panelWidth, deltaX));
}

/**
 * Swipe orizzontale verso sinistra per chiudere pannelli drawer (mobile).
 * ponytail: soglia fissa 30% larghezza; upgrade = velocity-based dismiss.
 */
export function useSwipeToDismiss(onDismiss: () => void, enabled: boolean) {
  const dragRef = useRef<DragState>({ startX: 0, startY: 0, active: false, dragging: false, lastDeltaX: 0 });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const swipeDismissedRef = useRef(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [snapBack, setSnapBack] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const resetDrag = useCallback(() => {
    dragRef.current = { startX: 0, startY: 0, active: false, dragging: false, lastDeltaX: 0 };
    setIsDragging(false);
    setDragX(0);
    setSnapBack(false);
    setIsDismissing(false);
  }, []);

  const onTouchStart = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const touch = e.touches[0];
      if (!touch) return;
      dragRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        active: true,
        dragging: false,
        lastDeltaX: 0,
      };
      setSnapBack(false);
      setIsDismissing(false);
    },
    [enabled],
  );

  const onTouchMove = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (!enabled || !dragRef.current.active) return;
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
        if (deltaX > 0) {
          dragRef.current.active = false;
          return;
        }
        dragRef.current.dragging = true;
        setIsDragging(true);
      }

      e.preventDefault();
      const width = panelRef.current?.offsetWidth ?? 320;
      const nextX = clampSwipeDismissDragX(deltaX, width);
      dragRef.current.lastDeltaX = nextX;
      setDragX(nextX);
    },
    [enabled],
  );

  const onTouchEnd = useCallback(() => {
    if (!dragRef.current.active) return;
    const width = panelRef.current?.offsetWidth ?? 320;
    const currentX = dragRef.current.dragging ? dragRef.current.lastDeltaX : 0;
    const shouldDismiss = dragRef.current.dragging && currentX <= -width * DISMISS_RATIO;

    dragRef.current = { startX: 0, startY: 0, active: false, dragging: false, lastDeltaX: 0 };

    if (shouldDismiss) {
      setIsDragging(false);
      setDragX(currentX);
      setIsDismissing(true);
      const reducedMotion =
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) {
        swipeDismissedRef.current = true;
        resetDrag();
        onDismiss();
      } else {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setDragX(-width));
        });
      }
      return;
    }

    if (currentX !== 0) {
      setSnapBack(true);
      setIsDragging(false);
      setDragX(0);
      return;
    }

    resetDrag();
  }, [onDismiss, resetDrag]);

  useEffect(() => {
    if (!isDismissing) return;
    const el = panelRef.current;
    if (!el) return;

    function onTransitionEnd(e: TransitionEvent) {
      if (e.target !== el || e.propertyName !== "transform") return;
      swipeDismissedRef.current = true;
      resetDrag();
      onDismiss();
    }

    el.addEventListener("transitionend", onTransitionEnd);
    const fallback = window.setTimeout(() => {
      if (!swipeDismissedRef.current) {
        swipeDismissedRef.current = true;
        resetDrag();
        onDismiss();
      }
    }, DISMISS_MS + 80);

    return () => {
      el.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(fallback);
    };
  }, [isDismissing, onDismiss, resetDrag]);

  const panelWidth = panelRef.current?.offsetWidth ?? 320;
  const backdropOpacity =
    isDismissing || dragX !== 0 ? Math.max(0, Math.min(1, 1 + dragX / panelWidth)) : undefined;

  const panelStyle: CSSProperties | undefined =
    dragX !== 0
      ? { transform: `translateX(${dragX}px)` }
      : snapBack
        ? { transform: "translateX(0)" }
        : undefined;

  const panelClassName = isDragging
    ? "cab-nav-drawer-dragging"
    : snapBack || isDismissing
      ? "cab-nav-drawer-snap-back"
      : undefined;

  return {
    panelRef,
    swipeDismissedRef,
    panelProps: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
      style: panelStyle,
      className: panelClassName,
    },
    backdropProps: {
      style: backdropOpacity !== undefined ? { opacity: backdropOpacity } : undefined,
      className: isDragging || snapBack || isDismissing ? "cab-nav-drawer-backdrop-dragging" : undefined,
    },
  };
}
