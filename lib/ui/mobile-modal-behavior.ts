/**
 * MobileModalBehaviorLayer — keyboard-aware modal scroll (mobile only via hook).
 * Layout-only: visualViewport sync, scroll nel container modale, marker DOM per audit.
 */

import { waitForViewportStable } from "@/lib/ui/gestionale-viewport-orchestrator";
import { gestionaleModalScrollBodyClass } from "@/lib/ui/modal-max-width-class";

/** Finestra in cui keyboard/textarea evitano re-scroll ridondante dopo focus chain. */
export const GESTIONALE_FOCUS_SCROLL_COALESCE_MS = 200;

let lastGestionaleFocusScrollAt = 0;
let lastGestionaleFocusScrollTarget: HTMLElement | null = null;

export function markGestionaleFocusScrollCompleted(field: HTMLElement): void {
  if (typeof performance === "undefined") return;
  lastGestionaleFocusScrollAt = performance.now();
  lastGestionaleFocusScrollTarget = resolveFocusScrollTarget(field);
}

export function shouldSkipRedundantGestionaleFocusScroll(
  field: HTMLElement,
  _reason: "keyboard-open" | "textarea-grow",
): boolean {
  if (typeof performance === "undefined") return false;
  if (performance.now() - lastGestionaleFocusScrollAt > GESTIONALE_FOCUS_SCROLL_COALESCE_MS) return false;
  return resolveFocusScrollTarget(field) === lastGestionaleFocusScrollTarget;
}

export const CAB_MODAL_ROOT_ATTR = "data-cab-modal-root";
export const CAB_MODAL_SCROLL_ATTR = "data-cab-modal-scroll";
export const CAB_IOS_NO_FOCUS_SCROLL_ATTR = "data-cab-ios-no-focus-scroll";
/** Contenitore sezione/card (titolo h3 incluso nel rettangolo scroll focus). */
export const CAB_FOCUS_SCROLL_GROUP_ATTR = "data-cab-focus-scroll-group";
/** Titolo esplicito nel gruppo (se non è h3/h4). */
export const CAB_FOCUS_SCROLL_TITLE_ATTR = "data-cab-focus-scroll-title";
/** Etichetta campo (es. `<p>` sopra combobox / multi-select in modale). */
export const CAB_FIELD_LABEL_ATTR = "data-cab-field-label";
/** Header/toolbar sticky espliciti per banda scroll focus (no query class*="sticky"). */
export const CAB_STICKY_HEADER_ATTR = "data-cab-sticky-header";

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

export type CabModalLayerTier = "base" | "stacked" | "confirm";

/** Classe z-index modale SSOT — preferire a literal `z-[100|110|120]`. */
export function cabModalLayerClass(tier: CabModalLayerTier = "base"): string {
  if (tier === "confirm") return cabModalZConfirm;
  if (tier === "stacked") return cabModalZStacked;
  return cabModalZBase;
}

/** Corpo scroll modale mobile: touch scroll + overscroll contenuto. */
export const gestionaleModalScrollBodyMobileClass = `${gestionaleModalScrollBodyClass} [-webkit-overflow-scrolling:touch]`;

export type ScrollFieldIntoModalOptions = {
  behavior?: ScrollBehavior;
  extraBottom?: number;
  extraTop?: number;
};

const MOBILE_FOCUS_SCROLL_MQ = "(max-width: 767px)";

/** Scroll container pagina gestionale (fuori modale). */
export const GESTIONALE_PAGE_SCROLL_SELECTOR = "main.gestionale-scroll-y";

/** Spazio visivo sopra label/campo su mobile (sotto browser chrome / header modale). */
export const MOBILE_FOCUS_EXTRA_TOP = 16;
export const DESKTOP_FOCUS_EXTRA_TOP = 8;
export const MOBILE_FOCUS_EXTRA_BOTTOM = 16;
export const DESKTOP_FOCUS_EXTRA_BOTTOM = 12;

export function resolveFocusExtraTop(): number {
  return isMobileFocusScrollViewport() ? MOBILE_FOCUS_EXTRA_TOP : DESKTOP_FOCUS_EXTRA_TOP;
}

export function resolveFocusExtraBottom(): number {
  return isMobileFocusScrollViewport() ? MOBILE_FOCUS_EXTRA_BOTTOM : DESKTOP_FOCUS_EXTRA_BOTTOM;
}

function isMobileFocusScrollViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_FOCUS_SCROLL_MQ).matches;
}

export function getVisualViewportBand(): { top: number; bottom: number } {
  if (typeof window === "undefined") return { top: 0, bottom: 0 };
  const vv = window.visualViewport;
  if (!vv) return { top: 0, bottom: window.innerHeight };
  return { top: vv.offsetTop, bottom: vv.offsetTop + vv.height };
}

function readSafeAreaPx(edge: "top" | "bottom"): number {
  if (typeof document === "undefined") return 0;
  const prop = edge === "top" ? "--cab-safe-top" : "--cab-safe-bottom";
  const raw = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
  const px = parseFloat(raw);
  return Number.isFinite(px) ? px : 0;
}

/** Bordo inferiore elementi sticky/header che ostruiscono la parte alta del viewport. */
export function findStickyObstructions(scope: HTMLElement | Document): number {
  if (typeof document === "undefined") return 0;
  const root = scope instanceof Document ? document.body : scope;
  let maxBottom = 0;

  const candidates = root.querySelectorAll(
    `header, .cab-ios-sticky-header, [${CAB_STICKY_HEADER_ATTR}]`,
  );
  for (const el of candidates) {
    if (!(el instanceof HTMLElement)) continue;
    const style = getComputedStyle(el);
    const isSticky =
      style.position === "sticky" ||
      el.classList.contains("cab-ios-sticky-header") ||
      el.hasAttribute(CAB_STICKY_HEADER_ATTR) ||
      el.tagName === "HEADER";
    if (!isSticky) continue;
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0 || rect.bottom <= 0) continue;
    if (rect.top > getVisualViewportBand().top + 48) continue;
    maxBottom = Math.max(maxBottom, rect.bottom);
  }
  return maxBottom;
}

export type EffectiveVisibleBandOptions = {
  containerRect: DOMRect;
  field: HTMLElement;
  extraTop?: number;
  extraBottom?: number;
};

/** Banda visibile effettiva condivisa da focus scroll e dropdown portal. */
export function getEffectiveVisibleBand(options: EffectiveVisibleBandOptions): {
  visibleTop: number;
  visibleBottom: number;
} {
  const { containerRect, field, extraTop = 0, extraBottom = 0 } = options;
  const vv = isMobileFocusScrollViewport() ? getVisualViewportBand() : null;
  const safeTop = readSafeAreaPx("top");
  const safeBottom = readSafeAreaPx("bottom");
  const keyboardInset = computeKeyboardInset();

  const modalRoot = field.closest(`[${CAB_MODAL_ROOT_ATTR}]`);
  const stickyBottom = modalRoot instanceof HTMLElement
    ? findStickyObstructions(modalRoot)
    : findStickyObstructions(document);
  const headerBottom = findModalHeaderBottom(field);

  const visibleTop =
    Math.max(
      containerRect.top,
      vv?.top ?? 0,
      safeTop,
      stickyBottom,
      headerBottom ?? 0,
    ) + extraTop;

  const vvBottom = vv ? Math.min(containerRect.bottom, vv.bottom) : containerRect.bottom;
  const visibleBottom = vvBottom - keyboardInset - safeBottom - extraBottom;

  return { visibleTop, visibleBottom };
}

/** Bordo inferiore header modale (evita che il campo finisca sotto la barra titolo). */
export function findModalHeaderBottom(field: HTMLElement): number | null {
  const root = field.closest(`[${CAB_MODAL_ROOT_ATTR}]`);
  if (!(root instanceof HTMLElement)) return null;
  const header = root.querySelector(
    `:scope > header, :scope [role='banner'], :scope [${CAB_STICKY_HEADER_ATTR}]`,
  );
  if (header instanceof HTMLElement) {
    return header.getBoundingClientRect().bottom;
  }
  const stickyInRoot = findStickyObstructions(root);
  return stickyInRoot > 0 ? stickyInRoot : null;
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

/** Bottoni ± in stepper (role=group + input): meritano scroll al focus. Esclude toggle segmented (solo bottoni). */
function isGestionaleStepperGroupButton(el: HTMLElement): boolean {
  if (el.tagName !== "BUTTON") return false;
  const group = el.closest('[role="group"]');
  if (!group) return false;
  return Boolean(group.querySelector('input:not([type="hidden"]), textarea, select'));
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
    if (isGestionaleStepperGroupButton(el)) return true;
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

/** Risolve scroll container: modale → pagina gestionale → overflow ancestor. */
export function findGestionaleScrollContainer(field: HTMLElement): HTMLElement | null {
  const marked = field.closest(`[${CAB_MODAL_SCROLL_ATTR}]`);
  if (marked instanceof HTMLElement) return marked;

  const pageMain = field.closest(GESTIONALE_PAGE_SCROLL_SELECTOR);
  if (pageMain instanceof HTMLElement) return pageMain;

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

function findModalScrollContainer(field: HTMLElement): HTMLElement | null {
  return findGestionaleScrollContainer(field);
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

/**
 * Delta scroll per tenere l'intero blocco etichetta+campo in [visibleTop, visibleBottom].
 * deltaMin: scroll minimo per non superare il bordo inferiore; deltaMax: massimo senza uscire in alto.
 */
export function computeFocusScrollDelta(
  scrollRect: FocusScrollRect,
  visibleTop: number,
  visibleBottom: number,
): number {
  const deltaMin = scrollRect.bottom - visibleBottom;
  const deltaMax = scrollRect.top - visibleTop;

  if (deltaMin <= deltaMax) {
    if (deltaMin <= 0 && deltaMax >= 0) return 0;
    if (deltaMin > 0) return deltaMin;
    return deltaMax;
  }

  return deltaMax;
}

/** Rettangolo scroll: top = min(titolo sezione, etichetta campo, campo); bottom = blocco label o campo. */
export function getFocusScrollRect(field: HTMLElement): FocusScrollRect {
  const fieldRect = field.getBoundingClientRect();
  const anchorTops: number[] = [];
  let bottom = fieldRect.bottom;

  const group = findFocusScrollGroup(field);
  if (group) {
    const titleEl = findGroupTitleElement(group, field);
    if (titleEl) {
      anchorTops.push(titleEl.getBoundingClientRect().top);
    }
  }

  const labelBlock = findFieldLabelBlock(field);
  if (labelBlock) {
    const blockRect = labelBlock.getBoundingClientRect();
    anchorTops.push(blockRect.top);
    bottom = Math.max(blockRect.bottom, fieldRect.bottom);
  }

  return {
    top: minFocusScrollTop(fieldRect.top, anchorTops),
    bottom,
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

/** Scroll controllato del campo nel container gestionale (modale o pagina). */
export function scrollGestionaleFieldIntoView(
  field: HTMLElement,
  options: ScrollFieldIntoModalOptions = {},
): boolean {
  if (typeof window === "undefined") return false;
  if (field.closest(`[${CAB_IOS_NO_FOCUS_SCROLL_ATTR}]`)) return false;

  const container = findGestionaleScrollContainer(field);
  if (!container) return false;

  const extraBottom = options.extraBottom ?? resolveFocusExtraBottom();
  const extraTop = options.extraTop ?? resolveFocusExtraTop();
  const containerRect = container.getBoundingClientRect();
  const scrollRect = getFocusScrollRect(field);
  const { visibleTop, visibleBottom } = getEffectiveVisibleBand({
    containerRect,
    field,
    extraTop,
    extraBottom,
  });

  const delta = computeFocusScrollDelta(scrollRect, visibleTop, visibleBottom);

  if (Math.abs(delta) < 2) {
    if (field.closest(`[${CAB_MODAL_ROOT_ATTR}]`)) {
      applyKeyboardPadToScrollContainer(container);
    }
    markGestionaleFocusScrollCompleted(field);
    return true;
  }

  const behavior = options.behavior ?? "auto";
  try {
    container.scrollBy({ top: delta, behavior });
  } catch {
    container.scrollTop += delta;
  }

  if (field.closest(`[${CAB_MODAL_ROOT_ATTR}]`)) {
    applyKeyboardPadToScrollContainer(container);
  }
  markGestionaleFocusScrollCompleted(field);
  return true;
}

/** @deprecated Usare scrollGestionaleFieldIntoView */
export function scrollFieldIntoModalView(
  field: HTMLElement,
  options: ScrollFieldIntoModalOptions = {},
): boolean {
  return scrollGestionaleFieldIntoView(field, options);
}

/** Focus fuori modale: scroll nel container pagina con stessa math SSOT. */
export function scrollFieldIntoDocumentView(field: HTMLElement): void {
  if (field.closest(`[${CAB_IOS_NO_FOCUS_SCROLL_ATTR}]`)) return;
  if (field.closest(`[${CAB_MODAL_ROOT_ATTR}]`)) return;
  scrollGestionaleFieldIntoView(field, { behavior: "auto" });
}

/** Scroll modale/pagina per qualsiasi controllo gestionale (focus già risolto). */
export function scrollGestionaleFieldIntoModal(
  field: HTMLElement,
  options: ScrollFieldIntoModalOptions = {},
): boolean {
  return scrollGestionaleFieldIntoView(resolveFocusScrollTarget(field), options);
}

let focusScrollGeneration = 0;

/** Scroll dopo layout stabile — last-wins: solo l'ultimo focus esegue retry post viewport stable. */
export function scheduleGestionaleFieldScroll(
  field: HTMLElement | null | undefined,
  options: ScrollFieldIntoModalOptions = {},
): void {
  if (!field || typeof window === "undefined") return;
  const merged: ScrollFieldIntoModalOptions = {
    extraTop: resolveFocusExtraTop(),
    extraBottom: resolveFocusExtraBottom(),
    behavior: "auto",
    ...options,
  };
  const target = resolveFocusScrollTarget(field);
  const gen = ++focusScrollGeneration;

  void (async () => {
    await new Promise<void>((r) => window.requestAnimationFrame(() => r()));
    if (gen !== focusScrollGeneration) return;
    const insetBefore = computeKeyboardInset();
    scrollGestionaleFieldIntoView(target, merged);
    await waitForViewportStable();
    if (gen !== focusScrollGeneration) return;
    if (computeKeyboardInset() !== insetBefore) {
      scrollGestionaleFieldIntoView(target, merged);
    }
  })();
}

/** Handler focusin unificato (mobile + desktop safe). */
export function handleFocusInForMobileModal(e: FocusEvent): void {
  const raw = e.target;
  if (raw == null || !isFocusableField(raw)) return;
  const target = resolveFocusScrollTarget(raw);

  syncKeyboardCssVars();
  scheduleGestionaleFieldScroll(target);
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
  computeFocusScrollDelta,
  getFocusScrollRect,
  findFocusScrollGroup,
  findFieldLabelBlock,
  findGestionaleFieldContainer,
  findModalHeaderBottom,
  isGestionaleFocusableField,
  MOBILE_FOCUS_EXTRA_TOP,
  DESKTOP_FOCUS_EXTRA_TOP,
  resolveFocusExtraTop,
  resolveFocusExtraBottom,
  resolveFocusScrollTarget,
  scrollGestionaleFieldIntoModal,
  scrollGestionaleFieldIntoView,
  scheduleGestionaleFieldScroll,
  scrollFieldIntoModalView,
  scrollFieldIntoDocumentView,
  handleFocusInForMobileModal,
  getEffectiveVisibleBand,
  findStickyObstructions,
  findGestionaleScrollContainer,
  getVisualViewportBand,
  GESTIONALE_PAGE_SCROLL_SELECTOR,
} as const;
