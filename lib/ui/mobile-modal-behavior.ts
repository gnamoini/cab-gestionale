/**
 * MobileModalBehaviorLayer — keyboard-aware modal scroll (mobile only via hook).
 * Layout-only: visualViewport sync, scroll nel container modale, marker DOM per audit.
 */

import { gestionaleModalScrollBodyClass } from "@/lib/ui/modal-max-width-class";

export const CAB_MODAL_ROOT_ATTR = "data-cab-modal-root";
export const CAB_MODAL_SCROLL_ATTR = "data-cab-modal-scroll";
export const CAB_IOS_NO_FOCUS_SCROLL_ATTR = "data-cab-ios-no-focus-scroll";

/** Z-index stack nested modali gestionale. */
export const cabModalZBase = "z-[100]";
export const cabModalZStacked = "z-[110]";
export const cabModalZConfirm = "z-[120]";

/** Corpo scroll modale mobile: touch scroll + overscroll contenuto. */
export const gestionaleModalScrollBodyMobileClass = `${gestionaleModalScrollBodyClass} [-webkit-overflow-scrolling:touch]`;

export type ScrollFieldIntoModalOptions = {
  behavior?: ScrollBehavior;
  extraBottom?: number;
};

/** Inset tastiera virtuale (px) — 0 se visualViewport assente o desktop. */
export function computeKeyboardInset(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  const layoutHeight = window.innerHeight;
  const visibleBottom = vv.height + vv.offsetTop;
  return Math.max(0, Math.round(layoutHeight - visibleBottom));
}

/** Sincronizza CSS vars viewport / keyboard su documentElement. */
export function syncKeyboardCssVars(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vv = window.visualViewport;
  if (!vv) {
    root.style.removeProperty("--cab-vv-height");
    root.style.removeProperty("--cab-vv-offset-top");
    root.style.removeProperty("--cab-keyboard-inset");
    return;
  }
  root.style.setProperty("--cab-vv-height", `${Math.round(vv.height)}px`);
  root.style.setProperty("--cab-vv-offset-top", `${Math.round(vv.offsetTop)}px`);
  root.style.setProperty("--cab-keyboard-inset", `${computeKeyboardInset()}px`);
}

function isFocusableField(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function findModalScrollContainer(field: HTMLElement): HTMLElement | null {
  const marked = field.closest(`[${CAB_MODAL_SCROLL_ATTR}]`);
  if (marked instanceof HTMLElement) return marked;

  let node: HTMLElement | null = field.parentElement;
  while (node) {
    if (node.hasAttribute(CAB_MODAL_SCROLL_ATTR)) return node;
    const style = window.getComputedStyle(node);
    const scrollable =
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight + 1;
    if (scrollable) return node;
    node = node.parentElement;
  }
  return null;
}

/** Applica padding-bottom keyboard sullo scroll body attivo (mobile). */
export function applyKeyboardPadToScrollContainer(container: HTMLElement | null): void {
  if (!container) return;
  const inset = computeKeyboardInset();
  container.style.paddingBottom = inset > 0 ? `${inset}px` : "";
}

/** Scroll controllato del campo dentro il container modale (no jump documento). */
export function scrollFieldIntoModalView(
  field: HTMLElement,
  options: ScrollFieldIntoModalOptions = {},
): boolean {
  if (typeof window === "undefined") return false;
  if (field.closest(`[${CAB_IOS_NO_FOCUS_SCROLL_ATTR}]`)) return false;

  const container = findModalScrollContainer(field);
  if (!container) return false;

  const extraBottom = options.extraBottom ?? 12;
  const keyboardInset = computeKeyboardInset();
  const containerRect = container.getBoundingClientRect();
  const fieldRect = field.getBoundingClientRect();

  const visibleBottom =
    containerRect.bottom - keyboardInset - extraBottom;
  const visibleTop = containerRect.top + extraBottom;

  let delta = 0;
  if (fieldRect.bottom > visibleBottom) {
    delta = fieldRect.bottom - visibleBottom;
  } else if (fieldRect.top < visibleTop) {
    delta = fieldRect.top - visibleTop;
  }

  if (Math.abs(delta) < 2) return true;

  const behavior = options.behavior ?? "smooth";
  try {
    container.scrollBy({ top: delta, behavior });
  } catch {
    container.scrollTop += delta;
  }

  applyKeyboardPadToScrollContainer(container);
  return true;
}

/** Focus fuori modale: scroll documento nearest (comportamento legacy). */
export function scrollFieldIntoDocumentView(field: HTMLElement): void {
  if (field.closest(`[${CAB_IOS_NO_FOCUS_SCROLL_ATTR}]`)) return;
  if (field.closest(`[${CAB_MODAL_ROOT_ATTR}]`)) return;

  window.requestAnimationFrame(() => {
    try {
      field.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
    } catch {
      /* ignore */
    }
  });
}

/** Handler focusin unificato (mobile + desktop safe). */
export function handleFocusInForMobileModal(e: FocusEvent): void {
  const target = e.target;
  if (target == null || !isFocusableField(target)) return;

  syncKeyboardCssVars();

  if (target.closest(`[${CAB_MODAL_ROOT_ATTR}]`)) {
    window.requestAnimationFrame(() => {
      scrollFieldIntoModalView(target, { behavior: "smooth" });
    });
    return;
  }

  scrollFieldIntoDocumentView(target);
}

export const MobileModalBehaviorLayer = {
  rootAttr: CAB_MODAL_ROOT_ATTR,
  scrollAttr: CAB_MODAL_SCROLL_ATTR,
  scrollBodyMobileClass: gestionaleModalScrollBodyMobileClass,
  zBase: cabModalZBase,
  zStacked: cabModalZStacked,
  zConfirm: cabModalZConfirm,
  computeKeyboardInset,
  syncKeyboardCssVars,
  scrollFieldIntoModalView,
  scrollFieldIntoDocumentView,
  handleFocusInForMobileModal,
} as const;
