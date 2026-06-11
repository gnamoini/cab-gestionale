"use client";

import { useEffect } from "react";
import { healBodyScrollLockState } from "@/lib/ui/body-scroll-lock-manager";
import { mountGestionaleViewportOrchestrator } from "@/lib/ui/gestionale-viewport-orchestrator";
import { handleFocusInForMobileModal } from "@/lib/ui/mobile-modal-behavior";

/**
 * Sync Visual Viewport (iOS keyboard) e focus input.
 * Viewport events → orchestratore unico; focus → scroll container gestionale.
 * Montato una volta in AppProviders.
 */
export function IosInteractionStability() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    healBodyScrollLockState("ios-stability-mount");
    mountGestionaleViewportOrchestrator();

    const rootEl = document.documentElement;
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            mountGestionaleViewportOrchestrator();
          })
        : null;
    resizeObserver?.observe(rootEl);

    document.addEventListener("focusin", handleFocusInForMobileModal, true);

    return () => {
      resizeObserver?.disconnect();
      document.removeEventListener("focusin", handleFocusInForMobileModal, true);
      document.documentElement.style.removeProperty("--cab-vv-height");
      document.documentElement.style.removeProperty("--cab-vv-offset-top");
      document.documentElement.style.removeProperty("--cab-keyboard-inset");
    };
  }, []);

  return null;
}
