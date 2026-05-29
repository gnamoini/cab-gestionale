"use client";

import { useEffect } from "react";

/**
 * Sync Visual Viewport (iOS keyboard) e focus input senza scroll jump aggressivo.
 * Montato una volta in AppProviders.
 */
export function IosInteractionStability() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;

    const syncViewport = () => {
      const vv = window.visualViewport;
      if (!vv) {
        root.style.removeProperty("--cab-vv-height");
        root.style.removeProperty("--cab-vv-offset-top");
        return;
      }
      root.style.setProperty("--cab-vv-height", `${Math.round(vv.height)}px`);
      root.style.setProperty("--cab-vv-offset-top", `${Math.round(vv.offsetTop)}px`);
    };

    syncViewport();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncViewport);
    vv?.addEventListener("scroll", syncViewport);
    window.addEventListener("orientationchange", syncViewport);

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const tag = target.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") return;
      if (target.closest("[data-cab-ios-no-focus-scroll]")) return;

      window.requestAnimationFrame(() => {
        try {
          target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
        } catch {
          /* ignore */
        }
      });
    };

    document.addEventListener("focusin", onFocusIn, true);

    return () => {
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      document.removeEventListener("focusin", onFocusIn, true);
      root.style.removeProperty("--cab-vv-height");
      root.style.removeProperty("--cab-vv-offset-top");
    };
  }, []);

  return null;
}
