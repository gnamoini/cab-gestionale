/**
 * MobileModalBehaviorLayer — keyboard-aware modal scroll (mobile only via hook).
 * Layout-only: visualViewport sync, scroll nel container modale, marker DOM per audit.
 */

import { gestionaleModalScrollBodyClass } from "@/lib/ui/modal-max-width-class";

export const CAB_MODAL_ROOT_ATTR = "data-cab-modal-root";
export const CAB_MODAL_SCROLL_ATTR = "data-cab-modal-scroll";
export const CAB_IOS_NO_FOCUS_SCROLL_ATTR = "data-cab-ios-no-focus-scroll";
/** Contenitore sezione/card (marker layout; lo scroll focus usa solo etichetta campo). */
export const CAB_FOCUS_SCROLL_GROUP_ATTR = "data-cab-focus-scroll-group";
/** Titolo esplicito nel gruppo (se non è h3/h4). */
export const CAB_FOCUS_SCROLL_TITLE_ATTR = "data-cab-focus-scroll-title";
/** Etichetta campo (es. `<p>` sopra combobox / multi-select in modale). */
export const CAB_FIELD_LABEL_ATTR = "data-cab-field-label";

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
  extraTop?: number;
};

const MOBILE_FOCUS_SCROLL_MQ = "(max-width: 767px)";

function isMobileFocusScrollViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_FOCUS_SCROLL_MQ).matches;
}

function getVisualViewportBand(): { top: number; bottom: number } {
  if (typeof window === "undefined") return { top: 0, bottom: 0 };
  const vv = window.visualViewport;
  if (!vv) return { top: 0, bottom: window.innerHeight };
  return { top: vv.offsetTop, bottom: vv.offsetTop + vv.height };
}

/** Bordo inferiore header modale (evita che il campo finisca sotto la barra titolo). */
export function findModalHeaderBottom(field: HTMLElement): number | null {
  const root = field.closest(`[${CAB_MODAL_ROOT_ATTR}]`);
  if (!(root instanceof HTMLElement)) return null;
  const header = root.querySelector(":scope > header");
  if (header instanceof HTMLElement) {
    return header.getBoundingClientRect().bottom;
  }
  return null;
}

/** Tastiera in chiusura (back hardware, dismiss): non riscrollare il modale. */
export function isVirtualKeyboardClosing(prevInset: number, nextInset: number): boolean {
  return nextInset < prevInset;
}

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

function isFieldCaptionElement(el: HTMLElement): boolean {
  if (el.tagName === "LABEL") return true;
  if (el.hasAttribute(CAB_FIELD_LABEL_ATTR)) return true;
  if (el.tagName === "P" || el.tagName === "SPAN") {
    const cls = typeof el.className === "string" ? el.className : "";
    return cls.includes("font-medium");
  }
  return false;
}

/** Contenitore minimo etichetta + controllo (RicambioField, combobox, multi-select, …). */
export function findGestionaleFieldContainer(field: HTMLElement): HTMLElement | null {
  const modalRoot = field.closest(`[${CAB_MODAL_ROOT_ATTR}]`);
  let node: HTMLElement = field;
  for (;;) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    const current = node;
    const hasCaption = Array.from(parent.children).some(
      (ch) =>
        ch instanceof HTMLElement &&
        ch !== current &&
        !current.contains(ch) &&
        isFieldCaptionElement(ch) &&
        isBeforeInDocument(ch, field),
    );
    if (hasCaption) return parent;
    if (parent === modalRoot) break;
    node = parent;
  }
  return null;
}

function isGestionaleListTriggerButton(el: HTMLElement): boolean {
  if (el.tagName !== "BUTTON") return false;
  if (!el.closest(`[${CAB_MODAL_ROOT_ATTR}]`)) return false;
  const popup = el.getAttribute("aria-haspopup");
  return popup === "listbox" || popup === "combobox";
}

/** Tutti i controlli che meritano scroll in modale (mobile e desktop). */
export function isGestionaleFocusableField(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  const role = el.getAttribute("role");
  if (role === "combobox" || role === "searchbox" || role === "spinbutton") return true;
  if (tag === "BUTTON") {
    if (el.closest('[role="group"]')) return true;
    if (isGestionaleListTriggerButton(el)) return true;
  }
  return false;
}

/** Normalizza il target focus (stepper ± → input, ecc.). */
export function resolveFocusScrollTarget(el: HTMLElement): HTMLElement {
  if (el.tagName === "BUTTON") {
    const group = el.closest('[role="group"]');
    const input = group?.querySelector('input:not([type="hidden"])');
    if (input instanceof HTMLElement) return input;
  }
  return el;
}

function isFocusableField(el: EventTarget | null): el is HTMLElement {
  return isGestionaleFocusableField(el);
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

/** Blocco etichetta + controllo (label[for] + wrapper RicambioField / mt-1). */
export function findFieldLabelBlock(field: HTMLElement): HTMLElement | null {
  const labelWrap = field.closest("label");
  if (labelWrap instanceof HTMLElement && labelWrap.contains(field)) {
    return labelWrap;
  }

  const fieldId = field.id;
  if (fieldId) {
    const scope = field.closest(`[${CAB_MODAL_ROOT_ATTR}]`) ?? field.getRootNode();
    const root = scope instanceof HTMLElement ? scope : document.body;
    const linked = root.querySelector(`label[for="${fieldId}"]`);
    if (linked instanceof HTMLElement) {
      const block = linked.parentElement;
      if (block instanceof HTMLElement && block.contains(field)) return block;
    }
  }

  const fieldParent = field.parentElement;
  if (fieldParent?.classList.contains("mt-1")) {
    const block = fieldParent.parentElement;
    if (block instanceof HTMLElement) {
      if (block.tagName === "LABEL") return block;
      if (block.querySelector("label, span")) return block;
    }
  }

  const gestionaleContainer = findGestionaleFieldContainer(field);
  if (gestionaleContainer) return gestionaleContainer;

  const labelledBy = field.getAttribute("aria-labelledby");
  if (labelledBy) {
    for (const id of labelledBy.split(/\s+/)) {
      const el = document.getElementById(id);
      if (el instanceof HTMLElement) return el;
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

/** Rettangolo scroll: top = min(etichetta campo, campo); bottom = campo (no titolo sezione). */
export function getFocusScrollRect(field: HTMLElement): FocusScrollRect {
  const fieldRect = field.getBoundingClientRect();
  const anchorTops: number[] = [];

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
  const extraTop = options.extraTop ?? 8;
  const containerRect = container.getBoundingClientRect();
  const scrollRect = getFocusScrollRect(field);
  const headerBottom = findModalHeaderBottom(field);
  const vv = isMobileFocusScrollViewport() ? getVisualViewportBand() : null;

  const visibleBottom = vv
    ? Math.min(containerRect.bottom, vv.bottom) - extraBottom
    : containerRect.bottom - computeKeyboardInset() - extraBottom;

  const visibleTop = Math.max(
    containerRect.top,
    headerBottom ?? containerRect.top,
    vv?.top ?? 0,
  ) + extraTop;

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

/** Scroll modale per qualsiasi controllo gestionale (focus già risolto). */
export function scrollGestionaleFieldIntoModal(
  field: HTMLElement,
  options: ScrollFieldIntoModalOptions = {},
): boolean {
  return scrollFieldIntoModalView(resolveFocusScrollTarget(field), options);
}

/** Doppio rAF: scroll dopo layout tastiera / apertura dropdown. */
export function scheduleGestionaleFieldScroll(
  field: HTMLElement | null | undefined,
  options: ScrollFieldIntoModalOptions = {},
): void {
  if (!field || typeof window === "undefined") return;
  const run = (behavior: ScrollBehavior) => scrollGestionaleFieldIntoModal(field, { ...options, behavior });
  window.requestAnimationFrame(() => {
    run("smooth");
    window.requestAnimationFrame(() => run("auto"));
  });
}

/** Handler focusin unificato (mobile + desktop safe). */
export function handleFocusInForMobileModal(e: FocusEvent): void {
  const raw = e.target;
  if (raw == null || !isFocusableField(raw)) return;
  const target = resolveFocusScrollTarget(raw);

  syncKeyboardCssVars();

  if (target.closest(`[${CAB_MODAL_ROOT_ATTR}]`)) {
    scheduleGestionaleFieldScroll(target);
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
  isVirtualKeyboardClosing,
  syncKeyboardCssVars,
  getFocusScrollRect,
  findFocusScrollGroup,
  findFieldLabelBlock,
  findGestionaleFieldContainer,
  findModalHeaderBottom,
  isGestionaleFocusableField,
  resolveFocusScrollTarget,
  scrollGestionaleFieldIntoModal,
  scheduleGestionaleFieldScroll,
  scrollFieldIntoModalView,
  scrollFieldIntoDocumentView,
  handleFocusInForMobileModal,
} as const;
