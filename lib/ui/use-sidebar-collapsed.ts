"use client";

import { useCallback, useEffect, useRef, useState, type FocusEvent } from "react";

/**
 * Hover intent sidebar desktop:
 * - delay apertura rail (passaggio rapido)
 * - espansione immediata su voce nav (intent esplicito)
 * - chiusura con grace period
 * - cooldown solo dopo aperture brevi (anti-oscillazione al bordo)
 */
export const SIDEBAR_HOVER_INTENT = {
  openDelayMs: 80,
  closeDelayMs: 120,
  reopenCooldownMs: 120,
  minOpenForNoCooldownMs: 280,
  blurCollapseMs: 40,
  /** Ignora focus restore dal drawer per evitare re-espansione sidebar. */
  overlayCloseFocusSuppressMs: 320,
  /** Attesa oltre animazione drawer prima del reconcile pointer. */
  overlayCloseReconcileMs: 260,
} as const;

export const GESTIONALE_OVERLAY_CLOSED_EVENT = "cab:gestionale-overlay-closed";

export function dispatchGestionaleOverlayClosed(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GESTIONALE_OVERLAY_CLOSED_EVENT));
}

/** Cursore ancora sopra la sidebar (inclusi figli portal nel DOM tree). */
export function isSidebarPointerActive(aside: HTMLElement): boolean {
  if (aside.matches(":hover")) return true;
  const hovered = document.querySelector(":hover");
  return Boolean(hovered && aside.contains(hovered));
}

export function isSidebarFocusActive(aside: HTMLElement): boolean {
  const active = document.activeElement;
  return active instanceof Node && aside.contains(active);
}

/** Ripristina focus sul trigger sidebar solo se il puntatore è ancora sulla rail. */
export function restoreGestionaleDrawerFocus(opts: {
  trigger?: HTMLElement | null;
  restoreCapturedFocus?: () => void;
}): void {
  const { trigger, restoreCapturedFocus } = opts;
  const sidebar = trigger?.closest(".cab-sidebar");
  if (
    trigger &&
    sidebar instanceof HTMLElement &&
    isSidebarPointerActive(sidebar)
  ) {
    restoreCapturedFocus?.();
    try {
      trigger.focus({ preventScroll: true });
    } catch {
      /* elemento non focusable */
    }
    return;
  }

  const active = document.activeElement;
  if (active instanceof HTMLElement && active.closest(".cab-sidebar")) {
    active.blur();
  }
}

function resolveSidebarHoverTimings(): {
  openDelayMs: number;
  closeDelayMs: number;
  reopenCooldownMs: number;
  minOpenForNoCooldownMs: number;
  blurCollapseMs: number;
} {
  if (typeof window === "undefined") return SIDEBAR_HOVER_INTENT;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return {
      openDelayMs: 0,
      closeDelayMs: 0,
      reopenCooldownMs: 0,
      minOpenForNoCooldownMs: 0,
      blurCollapseMs: 0,
    };
  }
  return SIDEBAR_HOVER_INTENT;
}

/** Desktop: sidebar sempre compressa; espansione temporanea su hover o focus-within. */
export function useSidebarHoverExpand(): {
  collapsed: boolean;
  sidebarExpanded: boolean;
  collapseSidebar: () => void;
  reconcileSidebarPointer: (aside: HTMLElement | null) => void;
  onSidebarMouseEnter: () => void;
  onSidebarMouseLeave: () => void;
  onSidebarNavIntent: () => void;
  onSidebarFocusCapture: () => void;
  onSidebarBlurCapture: (event: FocusEvent<HTMLElement>) => void;
} {
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [sidebarFocused, setSidebarFocused] = useState(false);
  const sidebarHoveredRef = useRef(false);
  const hoverOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverReopenBlockedUntilRef = useRef(0);
  const expandedAtRef = useRef(0);
  const suppressFocusExpandUntilRef = useRef(0);

  const sidebarExpanded = sidebarHovered || sidebarFocused;
  const collapsed = !sidebarExpanded;

  const setHovered = useCallback((next: boolean) => {
    sidebarHoveredRef.current = next;
    if (next) expandedAtRef.current = Date.now();
    setSidebarHovered(next);
  }, []);

  const clearHoverTimers = useCallback(() => {
    if (hoverOpenTimerRef.current) {
      clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  const clearBlurTimer = useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    clearHoverTimers();
    clearBlurTimer();
  }, [clearBlurTimer, clearHoverTimers]);

  const expandSidebarNow = useCallback(() => {
    clearHoverTimers();
    hoverReopenBlockedUntilRef.current = 0;
    if (!sidebarHoveredRef.current) setHovered(true);
  }, [clearHoverTimers, setHovered]);

  const scheduleHoverCooldown = useCallback(() => {
    const timings = resolveSidebarHoverTimings();
    const openDuration = Date.now() - expandedAtRef.current;
    if (openDuration >= timings.minOpenForNoCooldownMs) {
      hoverReopenBlockedUntilRef.current = 0;
      return;
    }
    hoverReopenBlockedUntilRef.current = Date.now() + timings.reopenCooldownMs;
  }, []);

  const collapseSidebar = useCallback(() => {
    clearAllTimers();
    hoverReopenBlockedUntilRef.current = 0;
    expandedAtRef.current = 0;
    setHovered(false);
    setSidebarFocused(false);
  }, [clearAllTimers, setHovered]);

  const reconcileSidebarPointer = useCallback(
    (aside: HTMLElement | null) => {
      if (!aside) return;
      if (isSidebarPointerActive(aside) || isSidebarFocusActive(aside)) return;
      collapseSidebar();
    },
    [collapseSidebar],
  );

  const onSidebarMouseEnter = useCallback(() => {
    const timings = resolveSidebarHoverTimings();

    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }

    if (sidebarHoveredRef.current) return;

    if (Date.now() < hoverReopenBlockedUntilRef.current) return;

    if (hoverOpenTimerRef.current) return;

    if (timings.openDelayMs === 0) {
      expandSidebarNow();
      return;
    }

    hoverOpenTimerRef.current = setTimeout(() => {
      hoverOpenTimerRef.current = null;
      setHovered(true);
    }, timings.openDelayMs);
  }, [expandSidebarNow, setHovered]);

  const onSidebarMouseLeave = useCallback(() => {
    const timings = resolveSidebarHoverTimings();

    if (hoverOpenTimerRef.current) {
      clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
      return;
    }

    if (!sidebarHoveredRef.current) return;

    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);

    if (timings.closeDelayMs === 0) {
      setHovered(false);
      scheduleHoverCooldown();
      return;
    }

    hoverCloseTimerRef.current = setTimeout(() => {
      hoverCloseTimerRef.current = null;
      setHovered(false);
      scheduleHoverCooldown();
    }, timings.closeDelayMs);
  }, [scheduleHoverCooldown, setHovered]);

  const onSidebarNavIntent = useCallback(() => {
    if (sidebarHoveredRef.current) return;
    expandSidebarNow();
  }, [expandSidebarNow]);

  const onSidebarFocusCapture = useCallback(() => {
    if (Date.now() < suppressFocusExpandUntilRef.current) return;
    clearAllTimers();
    hoverReopenBlockedUntilRef.current = 0;
    setSidebarFocused(true);
    expandedAtRef.current = Date.now();
  }, [clearAllTimers]);

  const onSidebarBlurCapture = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const aside = event.currentTarget;
      const timings = resolveSidebarHoverTimings();
      clearBlurTimer();
      blurTimerRef.current = setTimeout(() => {
        blurTimerRef.current = null;
        if (!aside.contains(document.activeElement)) {
          setSidebarFocused(false);
        }
      }, timings.blurCollapseMs);
    },
    [clearBlurTimer],
  );

  useEffect(() => clearAllTimers, [clearAllTimers]);

  useEffect(() => {
    const onOverlayClosed = () => {
      collapseSidebar();
      const timings = resolveSidebarHoverTimings();
      suppressFocusExpandUntilRef.current =
        Date.now() +
        Math.max(
          SIDEBAR_HOVER_INTENT.overlayCloseFocusSuppressMs,
          SIDEBAR_HOVER_INTENT.overlayCloseReconcileMs + timings.blurCollapseMs,
        );

      window.setTimeout(() => {
        collapseSidebar();
        const aside = document.querySelector("aside.cab-sidebar");
        if (aside instanceof HTMLElement) {
          reconcileSidebarPointer(aside);
        }
      }, SIDEBAR_HOVER_INTENT.overlayCloseReconcileMs);
    };
    window.addEventListener(GESTIONALE_OVERLAY_CLOSED_EVENT, onOverlayClosed);
    return () => window.removeEventListener(GESTIONALE_OVERLAY_CLOSED_EVENT, onOverlayClosed);
  }, [collapseSidebar, reconcileSidebarPointer]);

  return {
    collapsed,
    sidebarExpanded,
    collapseSidebar,
    reconcileSidebarPointer,
    onSidebarMouseEnter,
    onSidebarMouseLeave,
    onSidebarNavIntent,
    onSidebarFocusCapture,
    onSidebarBlurCapture,
  };
}
