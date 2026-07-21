/**
 * Navigazione da tastiera ENTER nel gestionale: selezione primo suggerimento + focus campo successivo.
 */

const FOCUS_SCOPE_ATTR = "data-gestionale-focus-scope";

const FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"]):not([disabled]):not([aria-hidden="true"])',
  "textarea:not([disabled]):not([aria-hidden=\"true\"])",
  'select:not([disabled]):not([aria-hidden="true"])',
].join(", ");

function isVisible(el: HTMLElement): boolean {
  if (el.getClientRects().length === 0) {
    const pos = getComputedStyle(el).position;
    if (pos !== "fixed" && pos !== "sticky") return false;
  }
  const style = getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
}

function getFocusScope(from: HTMLElement): HTMLElement {
  return (
    from.closest(`[${FOCUS_SCOPE_ATTR}]`) ??
    from.closest("form") ??
    from.closest('[role="dialog"]') ??
    document.body
  );
}

function listFocusableFields(scope: HTMLElement): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(FIELD_SELECTOR)).filter((el) => {
    if (!isVisible(el)) return false;
    if (el.tabIndex < 0) return false;
    if (el.closest("[data-gestionale-focus-skip]")) return false;
    if (el.getAttribute("data-gestionale-enter") === "ignore") return false;
    return true;
  });
}

/** Campo successivo compilabile nel medesimo scope (form / pannello). */
export function focusNextGestionaleField(from: HTMLElement | null | undefined): boolean {
  if (!from || typeof document === "undefined") return false;
  const scope = getFocusScope(from);
  const fields = listFocusableFields(scope);
  const idx = fields.indexOf(from);
  const start = idx >= 0 ? idx + 1 : 0;
  for (let i = start; i < fields.length; i++) {
    const next = fields[i]!;
    next.focus();
    if (next instanceof HTMLInputElement && next.type !== "number") {
      try {
        next.select();
      } catch {
        /* ignore */
      }
    }
    return true;
  }
  return false;
}

const DEFAULT_FOCUS_DELAY_MS = 140;

/** Dopo chiusura dropdown / blur combobox, sposta il focus al campo successivo. */
export function scheduleFocusNextGestionaleField(
  from: HTMLElement | null | undefined,
  delayMs = DEFAULT_FOCUS_DELAY_MS,
): void {
  if (!from) return;
  window.setTimeout(() => focusNextGestionaleField(from), delayMs);
}

/** Come `scheduleFocusNextGestionaleField`, risolvendo l'elemento di partenza da id. */
export function scheduleFocusNextGestionaleFieldById(
  elementId: string,
  delayMs = DEFAULT_FOCUS_DELAY_MS,
): void {
  if (typeof document === "undefined") return;
  scheduleFocusNextGestionaleField(document.getElementById(elementId), delayMs);
}

export function shouldSkipGestionaleEnterAdvance(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true;
  if (target.closest("[data-gestionale-enter-ignore]")) return true;
  if (target.getAttribute("data-gestionale-enter") === "ignore") return true;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "BUTTON" || tag === "A") return true;
  if (target instanceof HTMLInputElement) {
    const t = target.type.toLowerCase();
    if (t === "checkbox" || t === "radio" || t === "submit" || t === "button" || t === "file") return true;
  }
  return false;
}

type EnterKeyEvent = KeyboardEvent | React.KeyboardEvent;

function isComposingEvent(e: EnterKeyEvent): boolean {
  if ("nativeEvent" in e && e.nativeEvent && "isComposing" in e.nativeEvent) {
    return Boolean(e.nativeEvent.isComposing);
  }
  return "isComposing" in e && Boolean((e as KeyboardEvent).isComposing);
}

function isPlainEnter(e: EnterKeyEvent): boolean {
  return (
    e.key === "Enter" &&
    !e.shiftKey &&
    !e.altKey &&
    !e.ctrlKey &&
    !e.metaKey &&
    !isComposingEvent(e)
  );
}

/**
 * ENTER su input/textarea standard: non invia il form, avanza al campo successivo.
 * Restituisce true se l'evento è stato gestito.
 */
export function gestionaleAdvanceFocusOnEnter(e: EnterKeyEvent): boolean {
  if (!isPlainEnter(e)) return false;
  if ("defaultPrevented" in e && e.defaultPrevented) return false;
  const target = e.target;
  if (shouldSkipGestionaleEnterAdvance(target)) return false;
  e.preventDefault();
  if (target instanceof HTMLElement) scheduleFocusNextGestionaleField(target);
  return true;
}

/** Unisce handler custom e avanzamento focus (per input nativi). */
export function chainGestionaleEnterKeyDown(
  e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  custom?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>,
): void {
  custom?.(e);
  if (!e.defaultPrevented) gestionaleAdvanceFocusOnEnter(e);
}
