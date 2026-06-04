/**
 * MobileModalBehaviorLayer — keyboard-aware modal scroll (mobile only via hook).
 * Layout-only: visualViewport sync, scroll nel container modale, marker DOM per audit.
 */

import { gestionaleModalScrollBodyClass } from "@/lib/ui/modal-max-width-class";

export const CAB_MODAL_ROOT_ATTR = "data-cab-modal-root";
export const CAB_MODAL_SCROLL_ATTR = "data-cab-modal-scroll";
export const CAB_IOS_NO_FOCUS_SCROLL_ATTR = "data-cab-ios-no-focus-scroll";
/** Contenitore sezione/card: scroll focus include titolo gruppo + etichetta campo. */
export const CAB_FOCUS_SCROLL_GROUP_ATTR = "data-cab-focus-scroll-group";
/** Titolo esplicito nel gruppo (se non è h3/h4). */
export const CAB_FOCUS_SCROLL_TITLE_ATTR = "data-cab-focus-scroll-title";

export type FocusScrollRect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

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

function isBeforeInDocument(anchor: HTMLElement, field: HTMLElement): boolean {
  return Boolean(anchor.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING);
}

/** Box/sezione che contiene titolo + campi (attributo o `<section>` con h3/h4). */
export function findFocusScrollGroup(field: HTMLElement): HTMLElement | null {
  const marked = field.closest(`[${CAB_FOCUS_SCROLL_GROUP_ATTR}]`);
  if (marked instanceof HTMLElement) return marked;

  const section = field.closest("section");
  if (section instanceof HTMLElement && section.querySelector("h3, h4")) {
    return section;
  }
  return null;
}

function findGroupTitleElement(group: HTMLElement, field: HTMLElement): HTMLElement | null {
  const explicit = group.querySelector(`[${CAB_FOCUS_SCROLL_TITLE_ATTR}]`);
  if (explicit instanceof HTMLElement && isBeforeInDocument(explicit, field)) {
    return explicit;
  }

  for (const heading of group.querySelectorAll("h3, h4")) {
    if (heading instanceof HTMLElement && isBeforeInDocument(heading, field)) {
      return heading;
    }
  }
  return null;
}

/** Blocco etichetta + controllo (label wrapper o FormField div.block). */
export function findFieldLabelBlock(field: HTMLElement): HTMLElement | null {
  const labelWrap = field.closest("label");
  if (labelWrap instanceof HTMLElement && labelWrap.contains(field)) {
    return labelWrap;
  }

  const fieldParent = field.parentElement;
  if (fieldParent?.classList.contains("mt-1")) {
    const block = fieldParent.parentElement;
    if (block instanceof HTMLElement) {
      if (block.tagName === "LABEL") return block;
      if (block.querySelector("label, span")) return block;
    }
  }

  return null;
}

/** Top del rettangolo scroll = minimo tra campo e ancore (titolo sezione, blocco label). */
export function minFocusScrollTop(fieldTop: number, anchorTops: number[]): number {
  let top = fieldTop;
  for (const t of anchorTops) {
    if (Number.isFinite(t)) top = Math.min(top, t);
  }
  return top;
}

/** Rettangolo scroll: top = min(titolo sezione, blocco label, campo); bottom = campo. */
export function getFocusScrollRect(field: HTMLElement): FocusScrollRect {
  const fieldRect = field.getBoundingClientRect();
  const anchorTops: number[] = [];

  const group = findFocusScrollGroup(field);
  if (group) {
    const title = findGroupTitleElement(group, field);
    if (title) anchorTops.push(title.getBoundingClientRect().top);
  }

  const labelBlock = findFieldLabelBlock(field);
  if (labelBlock) {
    anchorTops.push(labelBlock.getBoundingClientRect().top);
  }

  return {
    top: minFocusScrollTop(fieldRect.top, anchorTops),
    bottom: fieldRect.bottom,
    left: fieldRect.left,
    right: fieldRect.right,
  };
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
  const scrollRect = getFocusScrollRect(field);

  const visibleBottom =
    containerRect.bottom - keyboardInset - extraBottom;
  const visibleTop = containerRect.top + extraBottom;

  let delta = 0;
  if (scrollRect.bottom > visibleBottom) {
    delta = scrollRect.bottom - visibleBottom;
  } else if (scrollRect.top < visibleTop) {
    delta = scrollRect.top - visibleTop;
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
  focusScrollGroupAttr: CAB_FOCUS_SCROLL_GROUP_ATTR,
  focusScrollTitleAttr: CAB_FOCUS_SCROLL_TITLE_ATTR,
  computeKeyboardInset,
  syncKeyboardCssVars,
  getFocusScrollRect,
  findFocusScrollGroup,
  findFieldLabelBlock,
  scrollFieldIntoModalView,
  scrollFieldIntoDocumentView,
  handleFocusInForMobileModal,
} as const;
