"use client";

/** Debounce burst lifecycle prima del version check (visibility + pageshow + focus). */
export const GESTIONALE_RESUME_COORDINATOR_DEBOUNCE_MS = 2_000;

const handlers = new Set<() => void>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let listenerAttached = false;

function flushResumeHandlers(): void {
  debounceTimer = null;
  for (const handler of handlers) {
    try {
      handler();
    } catch {
      /* handler errors must not break coordinator */
    }
  }
}

function scheduleResumeFlush(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(flushResumeHandlers, GESTIONALE_RESUME_COORDINATOR_DEBOUNCE_MS);
}

function onVisibilityChange(): void {
  if (typeof document === "undefined" || document.visibilityState !== "visible") return;
  scheduleResumeFlush();
}

function onPageShow(event: Event): void {
  const pageEvent = event as PageTransitionEvent;
  if (!pageEvent.persisted) return;
  scheduleResumeFlush();
}

function onWindowFocus(): void {
  if (typeof document === "undefined" || document.visibilityState !== "visible") return;
  scheduleResumeFlush();
}

function ensureListeners(): void {
  if (listenerAttached || typeof document === "undefined") return;
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("focus", onWindowFocus);
  listenerAttached = true;
}

function maybeRemoveListeners(): void {
  if (!listenerAttached || handlers.size > 0 || typeof document === "undefined") return;
  document.removeEventListener("visibilitychange", onVisibilityChange);
  window.removeEventListener("pageshow", onPageShow);
  window.removeEventListener("focus", onWindowFocus);
  listenerAttached = false;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

/** Registra handler resume debounced — un solo path dati per burst lifecycle. */
export function registerGestionaleResumeHandler(handler: () => void): () => void {
  handlers.add(handler);
  ensureListeners();
  return () => {
    handlers.delete(handler);
    maybeRemoveListeners();
  };
}

/** Test helper */
export function resetGestionaleResumeCoordinatorForTests(): void {
  handlers.clear();
  maybeRemoveListeners();
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}
