"use client";

import { useEffect, type RefObject } from "react";
import { subscribeGestionaleViewport } from "@/lib/ui/gestionale-viewport-orchestrator";
import {
  applyKeyboardPadToScrollContainer,
  CAB_MODAL_ROOT_ATTR,
  CAB_MODAL_SCROLL_ATTR,
  isGestionaleFocusableField,
  isVirtualKeyboardClosing,
  resolveFocusExtraBottom,
  resolveFocusExtraTop,
  resolveFocusScrollTarget,
  scrollGestionaleFieldIntoView,
  shouldSkipRedundantGestionaleFocusScroll,
} from "@/lib/ui/mobile-modal-behavior";

const MOBILE_MQ = "(max-width: 767px)";

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

/** Scroll body modale/sheet: focus nel corpo o ricerca in header (es. bottom sheet). */
function findModalScrollContainer(
  root: HTMLElement,
  focused: HTMLElement | null,
): HTMLElement | null {
  if (focused) {
    const fromFocus = focused.closest(`[${CAB_MODAL_SCROLL_ATTR}]`);
    if (fromFocus instanceof HTMLElement && root.contains(fromFocus)) return fromFocus;
  }
  const marked = root.querySelector(`[${CAB_MODAL_SCROLL_ATTR}]`);
  return marked instanceof HTMLElement ? marked : null;
}

function scrollFocusedFieldInModal(root: HTMLElement): void {
  const focused = document.activeElement;
  if (
    !(focused instanceof HTMLElement) ||
    !root.contains(focused) ||
    !isGestionaleFocusableField(focused) ||
    !focused.closest(`[${CAB_MODAL_ROOT_ATTR}]`)
  ) {
    return;
  }
  if (shouldSkipRedundantGestionaleFocusScroll(focused, "keyboard-open")) return;
  scrollGestionaleFieldIntoView(resolveFocusScrollTarget(focused), {
    behavior: "auto",
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

    let activeScrollEl: HTMLElement | null = null;
    let prevKeyboardInset = 0;

    const mq = window.matchMedia(MOBILE_MQ);
    const onMqChange = () => {
      if (!mq.matches && activeScrollEl) {
        activeScrollEl.style.paddingBottom = "";
        activeScrollEl = null;
      }
    };
    mq.addEventListener("change", onMqChange);

    const unsubscribe = subscribeGestionaleViewport((snapshot) => {
      if (!isMobileViewport()) {
        if (activeScrollEl) {
          activeScrollEl.style.paddingBottom = "";
          activeScrollEl = null;
        }
        prevKeyboardInset = 0;
        return;
      }

      const keyboardInset = snapshot.keyboardInset;
      const keyboardClosing = isVirtualKeyboardClosing(prevKeyboardInset, keyboardInset);
      const keyboardOpening = keyboardInset > prevKeyboardInset && keyboardInset > 48;

      const root = rootRef.current;
      if (!root) {
        prevKeyboardInset = keyboardInset;
        return;
      }

      const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      let scrollEl: HTMLElement | null = null;
      if (focused && root.contains(focused)) {
        scrollEl = findModalScrollContainer(root, focused);
      }
      if (!scrollEl && activeScrollEl && root.contains(activeScrollEl)) {
        scrollEl = activeScrollEl;
      }
      if (!scrollEl) {
        scrollEl = findModalScrollContainer(root, null);
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

      if (!keyboardClosing && (keyboardOpening || keyboardInset > 0)) {
        scrollFocusedFieldInModal(root);
      }

      prevKeyboardInset = keyboardInset;
    });

    return () => {
      unsubscribe();
      mq.removeEventListener("change", onMqChange);
      if (activeScrollEl) activeScrollEl.style.paddingBottom = "";
    };
  }, [rootRef]);
}
