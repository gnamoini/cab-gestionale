"use client";

import { useEffect } from "react";
import { healBodyScrollLockState } from "@/lib/ui/body-scroll-lock-manager";
import {
  handleFocusInForMobileModal,
  syncKeyboardCssVars,
} from "@/lib/ui/mobile-modal-behavior";
import { syncAppViewportFill } from "@/lib/ui/viewport-fill-sync";

/**
 * Sync Visual Viewport (iOS keyboard) e focus input.
 * Focus in modale → scroll container modale; fuori modale → scrollIntoView documento.
 * Montato una volta in AppProviders.
 */
export function IosInteractionStability() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    healBodyScrollLockState("ios-stability-mount");
    syncKeyboardCssVars();
    syncAppViewportFill();

    const vv = window.visualViewport;
    const rootEl = document.documentElement;
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            syncAppViewportFill();
          })
        : null;
    resizeObserver?.observe(rootEl);

    const onViewportChange = () => {
      healBodyScrollLockState("viewport-change");
      syncKeyboardCssVars();
      syncAppViewportFill();
    };
    vv?.addEventListener("resize", onViewportChange);
    vv?.addEventListener("scroll", onViewportChange);
    window.addEventListener("resize", onViewportChange, { passive: true });
    window.addEventListener("orientationchange", onViewportChange);
    document.addEventListener("focusin", handleFocusInForMobileModal, true);

    return () => {
      resizeObserver?.disconnect();
      vv?.removeEventListener("resize", onViewportChange);
      vv?.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      document.removeEventListener("focusin", handleFocusInForMobileModal, true);
      document.documentElement.style.removeProperty("--cab-vv-height");
      document.documentElement.style.removeProperty("--cab-vv-offset-top");
      document.documentElement.style.removeProperty("--cab-keyboard-inset");
    };
  }, []);

  return null;
}
