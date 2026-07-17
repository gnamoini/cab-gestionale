"use client";

import { useCallback, useEffect, useRef } from "react";

const DEDUP_MS = 50;

export type PointerGestureHandlers = {
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
  onPointerCancel: (e: PointerEvent) => void;
};

export type UsePointerGestureOptions = {
  enabled: boolean;
  /** Only touch and pen — not mouse (desktop) */
  pointerTypes?: ReadonlyArray<string>;
  onGestureStart: (e: PointerEvent) => void;
  onGestureMove: (e: PointerEvent) => void;
  onGestureEnd: (e: PointerEvent) => void;
  onGestureCancel: (e: PointerEvent) => void;
};

/**
 * Document-level pointer gesture with touch/pointer dedup and AbortController cleanup.
 */
export function usePointerGesture({
  enabled,
  pointerTypes = ["touch", "pen"],
  onGestureStart,
  onGestureMove,
  onGestureEnd,
  onGestureCancel,
}: UsePointerGestureOptions) {
  const activePointerIdRef = useRef<number | null>(null);
  const lastTouchTimeRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const callbacksRef = useRef({
    onGestureStart,
    onGestureMove,
    onGestureEnd,
    onGestureCancel,
  });
  callbacksRef.current = {
    onGestureStart,
    onGestureMove,
    onGestureEnd,
    onGestureCancel,
  };

  const resetGesture = useCallback(() => {
    activePointerIdRef.current = null;
  }, []);

  useEffect(() => {
    const keepListening = enabled || activePointerIdRef.current != null;
    if (!keepListening || typeof document === "undefined") return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const { signal } = ac;

    function acceptsPointer(e: PointerEvent): boolean {
      if (!pointerTypes.includes(e.pointerType)) return false;
      if (activePointerIdRef.current != null && e.pointerId !== activePointerIdRef.current) {
        return false;
      }
      return true;
    }

    function onPointerDown(e: PointerEvent) {
      if (!acceptsPointer(e)) return;
      if (e.pointerType === "touch") {
        const now = Date.now();
        if (now - lastTouchTimeRef.current < DEDUP_MS && activePointerIdRef.current != null) return;
        lastTouchTimeRef.current = now;
      }
      activePointerIdRef.current = e.pointerId;
      callbacksRef.current.onGestureStart(e);
    }

    function onPointerMove(e: PointerEvent) {
      if (activePointerIdRef.current !== e.pointerId) return;
      callbacksRef.current.onGestureMove(e);
    }

    function onPointerUp(e: PointerEvent) {
      if (activePointerIdRef.current !== e.pointerId) return;
      callbacksRef.current.onGestureEnd(e);
      resetGesture();
    }

    function onPointerCancel(e: PointerEvent) {
      if (activePointerIdRef.current !== e.pointerId) return;
      callbacksRef.current.onGestureCancel(e);
      resetGesture();
    }

    function onTouchStart(e: TouchEvent) {
      const now = Date.now();
      if (now - lastTouchTimeRef.current < DEDUP_MS && activePointerIdRef.current != null) return;
      lastTouchTimeRef.current = now;
    }

    document.addEventListener("pointerdown", onPointerDown, { signal, passive: true });
    document.addEventListener("pointermove", onPointerMove, { signal, passive: false });
    document.addEventListener("pointerup", onPointerUp, { signal });
    document.addEventListener("pointercancel", onPointerCancel, { signal });
    document.addEventListener("touchstart", onTouchStart, { signal, passive: true });

    return () => {
      ac.abort();
      if (abortRef.current === ac) abortRef.current = null;
    };
  }, [enabled, pointerTypes, resetGesture]);

  return { resetGesture, activePointerIdRef };
}

/** Apply transform/opacity directly — compositor-only during drag */
export function applyCompositorTransform(
  panel: HTMLElement | null,
  backdrop: HTMLElement | null,
  transform: string,
  backdropOpacity: number,
): void {
  if (panel) panel.style.transform = transform;
  if (backdrop) backdrop.style.opacity = String(backdropOpacity);
}

export function clearCompositorStyles(panel: HTMLElement | null, backdrop: HTMLElement | null): void {
  if (panel) {
    panel.style.removeProperty("transform");
    panel.style.removeProperty("opacity");
  }
  if (backdrop) backdrop.style.removeProperty("opacity");
}
