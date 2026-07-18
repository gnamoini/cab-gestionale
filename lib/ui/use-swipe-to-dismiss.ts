"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type TouchEvent } from "react";
import type { NavDrawerState } from "@/lib/ui/mobile-nav-drawer-contract";
import {
  NAV_DRAWER_ANIMATION_MS,
  rubberBandDragX,
  shouldCommitGesture,
} from "@/lib/ui/mobile-nav-drawer-contract";
import { shouldNavDrawerClaimDismiss, type GestureContext } from "@/lib/ui/gesture-arbitration";
import { recordDrawerTelemetry } from "@/lib/ui/mobile-nav-drawer-telemetry";
import { applyCompositorTransform, clearCompositorStyles } from "@/lib/ui/use-pointer-gesture";

const ACTIVATION_PX = 8;

type DragState = {
  startX: number;
  startY: number;
  active: boolean;
  dragging: boolean;
  lastDeltaX: number;
  lastTime: number;
  velocityX: number;
};

/** Chiusura drawer: mai oltre la posizione aperta (bordo sinistro ancorato). */
export function clampSwipeDismissDragX(deltaX: number, panelWidth: number): number {
  return Math.min(0, Math.max(-panelWidth, deltaX));
}

export type UseSwipeToDismissOptions = {
  onDismiss: () => void;
  enabled: boolean;
  drawerState: NavDrawerState;
  overlayActive: boolean;
  onDragStart?: () => void;
  onDragCancel?: () => void;
};

export function useSwipeToDismiss({
  onDismiss,
  enabled,
  drawerState,
  overlayActive,
  onDragStart,
  onDragCancel,
}: UseSwipeToDismissOptions) {
  const dragRef = useRef<DragState>({
    startX: 0,
    startY: 0,
    active: false,
    dragging: false,
    lastDeltaX: 0,
    lastTime: 0,
    velocityX: 0,
  });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLElement | null>(null);
  const swipeDismissedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef({ dragX: 0, panelWidth: 320 });
  const [isDragging, setIsDragging] = useState(false);
  const [snapBack, setSnapBack] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const flushTransform = useCallback(() => {
    rafRef.current = null;
    const { dragX, panelWidth } = pendingRef.current;
    const opacity = Math.max(0, Math.min(1, 1 + dragX / panelWidth));
    applyCompositorTransform(panelRef.current, backdropRef.current, `translate3d(${dragX}px, 0, 0)`, opacity);
  }, []);

  const scheduleTransform = useCallback(
    (dragX: number, panelWidth: number) => {
      pendingRef.current = { dragX, panelWidth };
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
      active: false,
      dragging: false,
      lastDeltaX: 0,
      lastTime: 0,
      velocityX: 0,
    };
    setIsDragging(false);
    setSnapBack(false);
    setIsDismissing(false);
    clearCompositorStyles(panelRef.current, backdropRef.current);
  }, []);

  const buildCtx = useCallback(
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

  const onTouchStart = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const touch = e.touches[0];
      if (!touch) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!shouldNavDrawerClaimDismiss(buildCtx(target, touch.clientX, touch.clientY))) return;

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
    },
    [buildCtx, enabled],
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
        if (deltaX > 0) {
          dragRef.current.active = false;
          return;
        }
        dragRef.current.dragging = true;
        setIsDragging(true);
        onDragStart?.();
        try {
          e.currentTarget.setPointerCapture?.(e.nativeEvent instanceof PointerEvent ? e.nativeEvent.pointerId : 0);
        } catch {
          /* ignore */
        }
      }

      e.preventDefault();
      const width = panelRef.current?.offsetWidth ?? 320;
      const nextX = clampSwipeDismissDragX(deltaX, width);
      dragRef.current.lastDeltaX = nextX;
      scheduleTransform(rubberBandDragX(nextX, width), width);
    },
    [enabled, onDragStart, scheduleTransform],
  );

  const endGesture = useCallback(() => {
    if (!dragRef.current.active) return;
    const width = panelRef.current?.offsetWidth ?? 320;
    const currentX = dragRef.current.dragging ? dragRef.current.lastDeltaX : 0;
    const velocity = dragRef.current.velocityX;
    const shouldDismiss =
      dragRef.current.dragging && shouldCommitGesture(-currentX, width, velocity, "close");

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
      if (shouldCommitGesture(-currentX, width, velocity, "close") && currentX > -width * 0.3) {
        recordDrawerTelemetry("drawer_velocity_commit", { dir: "close" });
      }
      setIsDragging(false);
      setIsDismissing(true);
      const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) {
        swipeDismissedRef.current = true;
        onDismiss();
      } else {
        scheduleTransform(-width, width);
      }
      return;
    }

    if (currentX !== 0) {
      onDragCancel?.();
      setSnapBack(true);
      setIsDragging(false);
      scheduleTransform(0, width);
      return;
    }

    resetDrag();
  }, [onDismiss, onDragCancel, resetDrag, scheduleTransform]);

  const onTouchEnd = useCallback(() => endGesture(), [endGesture]);
  const onTouchCancel = useCallback(() => {
    recordDrawerTelemetry("drawer_pointer_cancel");
    onDragCancel?.();
    endGesture();
  }, [endGesture, onDragCancel]);

  useEffect(() => {
    if (!isDismissing) return;
    const el = panelRef.current;
    if (!el) return;

    function onTransitionEnd(e: TransitionEvent) {
      if (e.target !== el || e.propertyName !== "transform") return;
      swipeDismissedRef.current = true;
      onDismiss();
    }

    el.addEventListener("transitionend", onTransitionEnd);
    const fallback = window.setTimeout(() => {
      if (!swipeDismissedRef.current) {
        swipeDismissedRef.current = true;
        onDismiss();
      }
    }, NAV_DRAWER_ANIMATION_MS + 80);

    return () => {
      el.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(fallback);
    };
  }, [isDismissing, onDismiss]);

  useEffect(() => {
    if (!snapBack) return;
    const el = panelRef.current;
    if (!el) {
      resetDrag();
      return;
    }
    function onTransitionEnd(e: TransitionEvent) {
      if (e.target !== el || e.propertyName !== "transform") return;
      resetDrag();
    }
    el.addEventListener("transitionend", onTransitionEnd);
    const fallback = window.setTimeout(() => resetDrag(), NAV_DRAWER_ANIMATION_MS + 80);
    return () => {
      el.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(fallback);
    };
  }, [resetDrag, snapBack]);

  const panelClassName = isDragging
    ? "cab-nav-drawer-dragging"
    : snapBack || isDismissing
      ? "cab-nav-drawer-snap-back"
      : undefined;

  const panelStyle: CSSProperties | undefined = snapBack ? { transform: "translate3d(0, 0, 0)" } : undefined;

  return {
    panelRef,
    backdropRef,
    swipeDismissedRef,
    resetDrag,
    panelProps: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
      style: panelStyle,
      className: panelClassName,
    },
    backdropProps: {
      className: isDragging || snapBack || isDismissing ? "cab-nav-drawer-backdrop-dragging" : undefined,
    },
  };
}
