"use client";

import { useCallback, useEffect, useReducer, useRef, type RefObject } from "react";
import {
  NAV_DRAWER_EDGE_DRAG_IDLE_MS,
  NAV_DRAWER_WATCHDOG_MS,
  type NavDrawerEvent,
  type NavDrawerState,
  navDrawerAnimMs,
} from "@/lib/ui/mobile-nav-drawer-contract";
import { recordDrawerTelemetry } from "@/lib/ui/mobile-nav-drawer-telemetry";

export type NavDrawerMachineState = {
  state: NavDrawerState;
  mounted: boolean;
  edgePreview: boolean;
  edgeSettledOpen: boolean;
  closing: boolean;
};

export type NavDrawerFlags = {
  state: NavDrawerState;
  mounted: boolean;
  edgePreview: boolean;
  edgeSettledOpen: boolean;
  closing: boolean;
  isActive: boolean;
  isCommitted: boolean;
  canEdgeSwipe: boolean;
  canDismiss: boolean;
  isLocked: boolean;
  navDrawerVisible: boolean;
};

export const NAV_DRAWER_INITIAL: NavDrawerMachineState = {
  state: "CLOSED",
  mounted: false,
  edgePreview: false,
  edgeSettledOpen: false,
  closing: false,
};

const INITIAL = NAV_DRAWER_INITIAL;

function isSettling(state: NavDrawerState): boolean {
  return state === "SETTLING_OPEN" || state === "SETTLING_CLOSE" || state === "OPENING";
}

const EDGE_PREVIEW_STUCK_MS = NAV_DRAWER_EDGE_DRAG_IDLE_MS + 200;

export function deriveDrawerFlags(s: NavDrawerMachineState): NavDrawerFlags {
  const { state, mounted, edgePreview, edgeSettledOpen, closing } = s;
  const isCommitted = state === "OPEN" || (state === "DRAGGING" && !edgePreview);
  return {
    state,
    mounted,
    edgePreview,
    edgeSettledOpen,
    closing,
    isActive: mounted && state === "OPEN",
    isCommitted,
    canEdgeSwipe: state === "CLOSED",
    canDismiss: state === "OPEN" || (state === "DRAGGING" && !edgePreview),
    isLocked: state === "LOCKED",
    navDrawerVisible: mounted,
  };
}

export function navDrawerReducer(
  prev: NavDrawerMachineState,
  event: NavDrawerEvent,
): NavDrawerMachineState {
  const { state } = prev;

  switch (event) {
    case "OPEN_REQUEST":
      if (state === "DRAGGING" && prev.edgePreview) {
        return { ...prev, state: "OPENING", edgePreview: false, mounted: true, closing: false };
      }
      if (state !== "CLOSED") return prev;
      return { ...prev, state: "OPENING", mounted: true, closing: false, edgePreview: false };

    case "EDGE_DRAG_START":
      if (state !== "CLOSED") return prev;
      return {
        ...prev,
        state: "DRAGGING",
        mounted: true,
        edgePreview: true,
        closing: false,
        edgeSettledOpen: false,
      };

    case "EDGE_DRAG_END_COMMIT":
      if (state !== "DRAGGING" || !prev.edgePreview) return prev;
      return {
        ...prev,
        state: "SETTLING_OPEN",
        edgePreview: false,
        edgeSettledOpen: true,
      };

    case "EDGE_DRAG_END_CANCEL":
      if (state !== "DRAGGING" || !prev.edgePreview) return prev;
      recordDrawerTelemetry("drawer_cancel");
      return { ...prev, state: "SETTLING_CLOSE", edgePreview: false, closing: true };

    case "ANIMATION_END":
      if (state === "OPENING" || state === "SETTLING_OPEN") {
        recordDrawerTelemetry("drawer_open", { source: state === "SETTLING_OPEN" ? "edge" : "hamburger" });
        return { ...prev, state: "OPEN", closing: false };
      }
      if (state === "SETTLING_CLOSE" || state === "LOCKED") {
        recordDrawerTelemetry("drawer_close", { source: state === "LOCKED" ? "route" : "animation" });
        return { ...INITIAL };
      }
      return prev;

    case "DISMISS_DRAG_START":
      if (state !== "OPEN") return prev;
      return { ...prev, state: "DRAGGING", edgePreview: false };

    case "DISMISS_DRAG_END_COMMIT":
      if (state !== "DRAGGING" || prev.edgePreview) return prev;
      recordDrawerTelemetry("drawer_close", { source: "swipe" });
      return { ...prev, state: "SETTLING_CLOSE", closing: true };

    case "DISMISS_DRAG_END_CANCEL":
      if (state !== "DRAGGING" || prev.edgePreview) return prev;
      recordDrawerTelemetry("drawer_snap_back");
      return { ...prev, state: "OPEN", closing: false };

    case "CLOSE_REQUEST":
      if (state === "CLOSED" || state === "SETTLING_CLOSE") return prev;
      recordDrawerTelemetry("drawer_close", { source: "user" });
      return { ...prev, state: "SETTLING_CLOSE", edgePreview: false, closing: true };

    case "ROUTE_LOCK":
      if (state === "CLOSED") return prev;
      return { ...prev, state: "LOCKED", edgePreview: false, closing: true };

    case "POINTER_CANCEL":
      if (state !== "DRAGGING") return prev;
      recordDrawerTelemetry("drawer_pointer_cancel");
      if (prev.edgePreview) {
        return { ...prev, state: "SETTLING_CLOSE", edgePreview: false, closing: true };
      }
      return { ...prev, state: "SETTLING_CLOSE", closing: true };

    case "VISIBILITY_HIDDEN":
    case "FORCE_CLOSE":
      if (state === "CLOSED") return prev;
      recordDrawerTelemetry("drawer_force_close");
      return { ...INITIAL };

    case "RESIZE":
      if (state !== "DRAGGING") return prev;
      recordDrawerTelemetry("drawer_resize_recovery");
      if (prev.edgePreview) {
        return { ...prev, state: "SETTLING_CLOSE", edgePreview: false, closing: true };
      }
      return { ...prev, state: "OPEN", closing: false };

    case "WATCHDOG_TIMEOUT":
      if (!isSettling(state) && state !== "LOCKED" && state !== "OPENING") return prev;
      recordDrawerTelemetry("drawer_stuck_recovered");
      if (state === "SETTLING_OPEN" || state === "OPENING") {
        recordDrawerTelemetry("drawer_open", { source: "watchdog" });
        return { ...prev, state: "OPEN", closing: false };
      }
      recordDrawerTelemetry("drawer_close", { source: "watchdog" });
      return { ...INITIAL };

    default:
      return prev;
  }
}

export function useNavDrawerMachine(edgeDragActivityRef?: RefObject<number>) {
  const [machine, dispatch] = useReducer(navDrawerReducer, INITIAL);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flags = deriveDrawerFlags(machine);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current != null) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const scheduleWatchdog = useCallback(
    (phase: NavDrawerState) => {
      clearWatchdog();
      if (!isSettling(phase) && phase !== "LOCKED") return;
      const ms = navDrawerAnimMs(
        typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      watchdogRef.current = setTimeout(() => {
        dispatch("WATCHDOG_TIMEOUT");
      }, Math.max(ms, NAV_DRAWER_WATCHDOG_MS));
    },
    [clearWatchdog],
  );

  useEffect(() => {
    if (isSettling(machine.state) || machine.state === "LOCKED") {
      scheduleWatchdog(machine.state);
    } else {
      clearWatchdog();
    }
    return clearWatchdog;
  }, [machine.state, scheduleWatchdog, clearWatchdog]);

  useEffect(() => {
    if (machine.state !== "DRAGGING" || !machine.edgePreview) return;
    const enteredAt = Date.now();
    const id = setInterval(() => {
      const lastAt = edgeDragActivityRef?.current ?? 0;
      const idleMs = lastAt > enteredAt ? Date.now() - lastAt : Date.now() - enteredAt;
      if (idleMs < EDGE_PREVIEW_STUCK_MS) return;
      dispatch("POINTER_CANCEL");
    }, 100);
    return () => clearInterval(id);
  }, [edgeDragActivityRef, machine.edgePreview, machine.state]);

  const open = useCallback(() => dispatch("OPEN_REQUEST"), []);
  const close = useCallback(() => dispatch("CLOSE_REQUEST"), []);
  const forceClose = useCallback(() => dispatch("FORCE_CLOSE"), []);
  const routeLock = useCallback(() => dispatch("ROUTE_LOCK"), []);
  const onAnimationEnd = useCallback(() => dispatch("ANIMATION_END"), []);
  const onPointerCancel = useCallback(() => dispatch("POINTER_CANCEL"), []);
  const onVisibilityHidden = useCallback(() => dispatch("VISIBILITY_HIDDEN"), []);
  const onResize = useCallback(() => dispatch("RESIZE"), []);

  return {
    machine,
    flags,
    dispatch,
    open,
    close,
    forceClose,
    routeLock,
    onAnimationEnd,
    onPointerCancel,
    onVisibilityHidden,
    onResize,
  };
}
