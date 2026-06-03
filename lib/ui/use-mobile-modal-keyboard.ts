"use client";

import { useEffect, type RefObject } from "react";
import {
  applyKeyboardPadToScrollContainer,
  syncKeyboardCssVars,
} from "@/lib/ui/mobile-modal-behavior";

const MOBILE_MQ = "(max-width: 767px)";
const DEBOUNCE_MS = 100;

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_MQ).matches;
}

/**
 * Keyboard pad sullo scroll body del modale — attivo solo sotto 768px.
 * Focus scroll è gestito globalmente da IosInteractionStability.
 */
export function useMobileModalKeyboard(rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let activeScrollEl: HTMLElement | null = null;

    function onViewportChange() {
      if (!isMobileViewport()) {
        if (activeScrollEl) {
          activeScrollEl.style.paddingBottom = "";
          activeScrollEl = null;
        }
        return;
      }

      syncKeyboardCssVars();

      const root = rootRef.current;
      if (!root) return;

      const focused = document.activeElement;
      if (focused instanceof HTMLElement && root.contains(focused)) {
        const scrollEl = focused.closest("[data-cab-modal-scroll]");
        if (scrollEl instanceof HTMLElement) {
          activeScrollEl = scrollEl;
          applyKeyboardPadToScrollContainer(scrollEl);
        }
      }
    }

    function scheduleViewportSync() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(onViewportChange, DEBOUNCE_MS);
    }

    syncKeyboardCssVars();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", scheduleViewportSync);
    vv?.addEventListener("scroll", scheduleViewportSync);
    window.addEventListener("orientationchange", scheduleViewportSync);

    const mq = window.matchMedia(MOBILE_MQ);
    const onMqChange = () => {
      if (!mq.matches && activeScrollEl) {
        activeScrollEl.style.paddingBottom = "";
        activeScrollEl = null;
      }
      scheduleViewportSync();
    };
    mq.addEventListener("change", onMqChange);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      vv?.removeEventListener("resize", scheduleViewportSync);
      vv?.removeEventListener("scroll", scheduleViewportSync);
      window.removeEventListener("orientationchange", scheduleViewportSync);
      mq.removeEventListener("change", onMqChange);
      if (activeScrollEl) activeScrollEl.style.paddingBottom = "";
    };
  }, [rootRef]);
}
