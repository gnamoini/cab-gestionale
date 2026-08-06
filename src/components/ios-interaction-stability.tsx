"use client";

import { useLayoutEffect } from "react";
import { healBodyScrollLockState } from "@/lib/ui/body-scroll-lock-manager";
import {
  mountGestionaleViewportOrchestrator,
  syncGestionaleViewport,
} from "@/lib/ui/gestionale-viewport-orchestrator";
import { handleFocusInForMobileModal } from "@/lib/ui/mobile-modal-behavior";
import { mountMobileViewportDiagnostics } from "@/lib/observability/mobile-viewport-diagnostics";

/**
 * Sync Visual Viewport (iOS keyboard) e focus input.
 * Viewport events → orchestratore unico; focus → scroll container gestionale.
 * Montato una volta in AppProviders.
 */
export function IosInteractionStability() {
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    healBodyScrollLockState("ios-stability-mount");
    mountGestionaleViewportOrchestrator();
    syncGestionaleViewport("resize");

    const rootEl = document.documentElement;
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            syncGestionaleViewport("resize");
          })
        : null;
    resizeObserver?.observe(rootEl);

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      requestAnimationFrame(() => {
        syncGestionaleViewport("resize");
        healBodyScrollLockState("visibility-visible");
      });
    };
    document.addEventListener("visibilitychange", onVisibility);

    document.addEventListener("focusin", handleFocusInForMobileModal, true);

    const unmountDiagnostics = mountMobileViewportDiagnostics();

    return () => {
      resizeObserver?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("focusin", handleFocusInForMobileModal, true);
      unmountDiagnostics?.();
      document.documentElement.style.removeProperty("--cab-vv-height");
      document.documentElement.style.removeProperty("--cab-vv-offset-top");
      document.documentElement.style.removeProperty("--cab-keyboard-inset");
    };
  }, []);

  return null;
}
