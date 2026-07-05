"use client";

import { useCallback, useRef, useState, type CSSProperties, type TouchEvent } from "react";

const ACTIVATION_PX = 8;
const DISMISS_RATIO = 0.3;

type DragState = {
  startX: number;
  startY: number;
  active: boolean;
  dragging: boolean;
};

/**
 * Swipe orizzontale verso sinistra per chiudere pannelli drawer (mobile).
 * ponytail: soglia fissa 30% larghezza; upgrade = velocity-based dismiss.
 */
export function useSwipeToDismiss(onDismiss: () => void, enabled: boolean) {
  const dragRef = useRef<DragState>({ startX: 0, startY: 0, active: false, dragging: false });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [snapBack, setSnapBack] = useState(false);

  const resetDrag = useCallback(() => {
    dragRef.current = { startX: 0, startY: 0, active: false, dragging: false };
    setIsDragging(false);
    setDragX(0);
    setSnapBack(false);
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
      };
      setSnapBack(false);
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
      setDragX(Math.max(-width, deltaX));
    },
    [enabled],
  );

  const onTouchEnd = useCallback(() => {
    if (!dragRef.current.active) return;
    const width = panelRef.current?.offsetWidth ?? 320;
    const shouldDismiss = dragRef.current.dragging && dragX <= -width * DISMISS_RATIO;

    if (shouldDismiss) {
      resetDrag();
      onDismiss();
      return;
    }

    if (dragRef.current.dragging) {
      setSnapBack(true);
      setIsDragging(false);
      setDragX(0);
      dragRef.current = { startX: 0, startY: 0, active: false, dragging: false };
      return;
    }

    resetDrag();
  }, [dragX, onDismiss, resetDrag]);

  const panelStyle: CSSProperties | undefined =
    dragX !== 0
      ? { transform: `translateX(${dragX}px)` }
      : snapBack
        ? { transform: "translateX(0)" }
        : undefined;

  return {
    panelRef,
    panelProps: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
      style: panelStyle,
      className: isDragging ? "cab-nav-drawer-dragging" : snapBack ? "cab-nav-drawer-snap-back" : undefined,
    },
  };
}
