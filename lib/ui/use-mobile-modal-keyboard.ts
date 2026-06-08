"use client";

import { useEffect, type RefObject } from "react";
import {
  applyKeyboardPadToScrollContainer,
  CAB_MODAL_ROOT_ATTR,
  computeKeyboardInset,
  isGestionaleFocusableField,
  isVirtualKeyboardClosing,
  resolveFocusExtraBottom,
  resolveFocusExtraTop,
  resolveFocusScrollTarget,
  scrollGestionaleFieldIntoModal,
  syncKeyboardCssVars,
} from "@/lib/ui/mobile-modal-behavior";

const MOBILE_MQ = "(max-width: 767px)";
const DEBOUNCE_MS = 100;
/** Secondo pass dopo apertura tastiera iOS (layout visualViewport stabilizzato). */
const KEYBOARD_SETTLE_MS = 220;

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_MQ).matches;
}

function preserveModalScrollTop(scrollEl: HTMLElement): void {
  const savedTop = scrollEl.scrollTop;
  window.requestAnimationFrame(() => {
    scrollEl.scrollTop = savedTop;
    window.requestAnimationFrame(() => {
      scrollEl.scrollTop = savedTop;
    });
  });
}

function scrollFocusedFieldInModal(root: HTMLElement, behavior: ScrollBehavior = "auto"): void {
  const focused = document.activeElement;
  if (
    !(focused instanceof HTMLElement) ||
    !root.contains(focused) ||
    !isGestionaleFocusableField(focused) ||
    !focused.closest(`[${CAB_MODAL_ROOT_ATTR}]`)
  ) {
    return;
  }
  scrollGestionaleFieldIntoModal(resolveFocusScrollTarget(focused), {
    behavior,
    extraTop: resolveFocusExtraTop(),
    extraBottom: resolveFocusExtraBottom(),
  });
}

/**
 * Keyboard pad sullo scroll body del modale — attivo solo sotto 768px.
 * Focus scroll è gestito globalmente da IosInteractionStability.
 * Alla chiusura tastiera (es. tasto indietro Android) non riscrolla: mantiene scrollTop.
 */
export function useMobileModalKeyboard(rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let keyboardSettleTimer: ReturnType<typeof setTimeout> | null = null;
    let activeScrollEl: HTMLElement | null = null;
    let prevKeyboardInset = computeKeyboardInset();

    function onViewportChange() {
      if (!isMobileViewport()) {
        if (activeScrollEl) {
          activeScrollEl.style.paddingBottom = "";
          activeScrollEl = null;
        }
        prevKeyboardInset = 0;
        return;
      }

      syncKeyboardCssVars();
      const keyboardInset = computeKeyboardInset();
      const keyboardClosing = isVirtualKeyboardClosing(prevKeyboardInset, keyboardInset);
      const keyboardOpening = keyboardInset > prevKeyboardInset && keyboardInset > 48;

      const root = rootRef.current;
      if (!root) {
        prevKeyboardInset = keyboardInset;
        return;
      }

      const focused = document.activeElement;
      let scrollEl: HTMLElement | null = null;
      if (focused instanceof HTMLElement && root.contains(focused)) {
        const found = focused.closest("[data-cab-modal-scroll]");
        if (found instanceof HTMLElement) scrollEl = found;
      }
      if (!scrollEl && activeScrollEl && root.contains(activeScrollEl)) {
        scrollEl = activeScrollEl;
      }

      if (scrollEl) {
        activeScrollEl = scrollEl;
        const savedTop = scrollEl.scrollTop;
        applyKeyboardPadToScrollContainer(scrollEl);
        if (keyboardClosing) {
          scrollEl.scrollTop = savedTop;
          preserveModalScrollTop(scrollEl);
        }
      }

      if (!keyboardClosing && keyboardOpening) {
        scrollFocusedFieldInModal(root, "auto");
        if (keyboardSettleTimer) clearTimeout(keyboardSettleTimer);
        keyboardSettleTimer = setTimeout(() => {
          keyboardSettleTimer = null;
          scrollFocusedFieldInModal(root, "auto");
        }, KEYBOARD_SETTLE_MS);
      } else if (!keyboardClosing) {
        scrollFocusedFieldInModal(root, "auto");
      }

      prevKeyboardInset = keyboardInset;
    }

    function scheduleViewportSync() {
      const nextInset = computeKeyboardInset();
      const closing = isVirtualKeyboardClosing(prevKeyboardInset, nextInset);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (closing) {
        if (keyboardSettleTimer) {
          clearTimeout(keyboardSettleTimer);
          keyboardSettleTimer = null;
        }
        onViewportChange();
        return;
      }
      debounceTimer = setTimeout(onViewportChange, DEBOUNCE_MS);
    }

    syncKeyboardCssVars();
    prevKeyboardInset = computeKeyboardInset();

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
      if (keyboardSettleTimer) clearTimeout(keyboardSettleTimer);
      vv?.removeEventListener("resize", scheduleViewportSync);
      vv?.removeEventListener("scroll", scheduleViewportSync);
      window.removeEventListener("orientationchange", scheduleViewportSync);
      mq.removeEventListener("change", onMqChange);
      if (activeScrollEl) activeScrollEl.style.paddingBottom = "";
    };
  }, [rootRef]);
}
