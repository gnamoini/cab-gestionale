"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type TouchEvent } from "react";

const ACTIVATION_PX = 8;
const SWIPE_COMMIT_RATIO = 0.4;
const SWIPE_VELOCITY_COMMIT_PX_MS = 0.35;
const SWIPE_ANIMATION_MS = 200;

type DragState = {
  startX: number;
  startY: number;
  active: boolean;
  dragging: boolean;
  lastDeltaX: number;
  lastTime: number;
  velocityX: number;
};

export function clampToastSwipeDragX(deltaX: number, width: number): number {
  return Math.max(0, Math.min(width, deltaX));
}

export function shouldCommitToastSwipe(dragPx: number, width: number, velocityPxMs: number): boolean {
  return dragPx >= width * SWIPE_COMMIT_RATIO || velocityPxMs >= SWIPE_VELOCITY_COMMIT_PX_MS;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isToastSwipeEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(max-width: 767px)").matches) return true;
  return window.matchMedia("(pointer: coarse)").matches;
}

export type UseToastSwipeDismissOptions = {
  onDismiss: () => void;
  enabled: boolean;
};

export function useToastSwipeDismiss({ onDismiss, enabled }: UseToastSwipeDismissOptions) {
  const itemRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>({
    startX: 0,
    startY: 0,
    active: false,
    dragging: false,
    lastDeltaX: 0,
    lastTime: 0,
    velocityX: 0,
  });
  const dismissedRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [snapBack, setSnapBack] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [dragStyle, setDragStyle] = useState<CSSProperties | undefined>(undefined);

  const resetDrag = useCallback(() => {
    dragRef.current = {
      startX: 0,
      startY: 0,
      active: false,
      dragging: false,
      lastDeltaX: 0,
      lastTime: 0,
      velocityX: 0,
    };
    setIsDragging(false);
    setSnapBack(false);
    setIsDismissing(false);
    setDragStyle(undefined);
  }, []);

  const applyDragTransform = useCallback((dragX: number, width: number) => {
    const opacity = Math.max(0.35, Math.min(1, 1 - dragX / width * 0.65));
    setDragStyle({
      transform: `translate3d(${dragX}px, 0, 0)`,
      opacity,
    });
  }, []);

  const onTouchStart = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const touch = e.touches[0];
      if (!touch) return;
      if (e.target instanceof Element && e.target.closest("button")) return;

      dragRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        active: true,
        dragging: false,
        lastDeltaX: 0,
        lastTime: performance.now(),
        velocityX: 0,
      };
      setSnapBack(false);
      setIsDismissing(false);
      dismissedRef.current = false;
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
      const now = performance.now();
      const dt = Math.max(1, now - dragRef.current.lastTime);
      dragRef.current.velocityX = deltaX / dt;
      dragRef.current.lastTime = now;

      if (!dragRef.current.dragging) {
        if (Math.abs(deltaX) < ACTIVATION_PX && Math.abs(deltaY) < ACTIVATION_PX) return;
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          dragRef.current.active = false;
          return;
        }
        if (deltaX < 0) {
          dragRef.current.active = false;
          return;
        }
        dragRef.current.dragging = true;
        setIsDragging(true);
      }

      e.preventDefault();
      const width = itemRef.current?.offsetWidth ?? 320;
      const nextX = clampToastSwipeDragX(deltaX, width);
      dragRef.current.lastDeltaX = nextX;
      applyDragTransform(nextX, width);
    },
    [applyDragTransform, enabled],
  );

  const endGesture = useCallback(() => {
    if (!dragRef.current.active) return;
    const width = itemRef.current?.offsetWidth ?? 320;
    const currentX = dragRef.current.dragging ? dragRef.current.lastDeltaX : 0;
    const velocity = dragRef.current.velocityX;
    const shouldDismiss =
      dragRef.current.dragging && shouldCommitToastSwipe(currentX, width, velocity);

    dragRef.current = {
      startX: 0,
      startY: 0,
      active: false,
      dragging: false,
      lastDeltaX: 0,
      lastTime: 0,
      velocityX: 0,
    };

    if (shouldDismiss) {
      setIsDragging(false);
      if (prefersReducedMotion()) {
        dismissedRef.current = true;
        onDismiss();
        return;
      }
      setIsDismissing(true);
      setDragStyle({
        transform: `translate3d(${width}px, 0, 0)`,
        opacity: 0,
      });
      return;
    }

    if (currentX !== 0) {
      setSnapBack(true);
      setIsDragging(false);
      setDragStyle({ transform: "translate3d(0, 0, 0)", opacity: 1 });
      return;
    }

    resetDrag();
  }, [onDismiss, resetDrag]);

  const onTouchEnd = useCallback(() => endGesture(), [endGesture]);
  const onTouchCancel = useCallback(() => endGesture(), [endGesture]);

  useEffect(() => {
    if (!isDismissing) return;
    const el = itemRef.current;
    if (!el) return;

    function onTransitionEnd(e: TransitionEvent) {
      if (e.target !== el) return;
      if (e.propertyName !== "transform" && e.propertyName !== "opacity") return;
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      onDismiss();
    }

    el.addEventListener("transitionend", onTransitionEnd);
    const fallback = window.setTimeout(() => {
      if (!dismissedRef.current) {
        dismissedRef.current = true;
        onDismiss();
      }
    }, SWIPE_ANIMATION_MS + 80);

    return () => {
      el.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(fallback);
    };
  }, [isDismissing, onDismiss]);

  useEffect(() => {
    if (!snapBack) return;
    const el = itemRef.current;
    if (!el) {
      resetDrag();
      return;
    }

    function onTransitionEnd(e: TransitionEvent) {
      if (e.target !== el) return;
      if (e.propertyName !== "transform" && e.propertyName !== "opacity") return;
      resetDrag();
    }

    el.addEventListener("transitionend", onTransitionEnd);
    const fallback = window.setTimeout(() => resetDrag(), SWIPE_ANIMATION_MS + 80);
    return () => {
      el.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(fallback);
    };
  }, [resetDrag, snapBack]);

  const itemClassName = isDragging
    ? "cab-toast-item--dragging"
    : snapBack || isDismissing
      ? "cab-toast-item--snap-back"
      : undefined;

  return {
    itemRef,
    itemProps: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
    },
    itemStyle: dragStyle,
    itemClassName,
  };
}

export function useToastSwipeEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isToastSwipeEnvironment());
    const mqMobile = window.matchMedia("(max-width: 767px)");
    const mqCoarse = window.matchMedia("(pointer: coarse)");
    const sync = () => setEnabled(isToastSwipeEnvironment());
    mqMobile.addEventListener("change", sync);
    mqCoarse.addEventListener("change", sync);
    return () => {
      mqMobile.removeEventListener("change", sync);
      mqCoarse.removeEventListener("change", sync);
    };
  }, []);

  return enabled;
}
