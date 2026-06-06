/** Debounce unificato per handler visibilitychange (auth refresh + snapshot recovery). */
export const GESTIONALE_VISIBILITY_COORDINATOR_DEBOUNCE_MS = 2_000;

const handlers = new Set<() => void>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let listenerAttached = false;

function flushVisibilityHandlers(): void {
  debounceTimer = null;
  for (const handler of handlers) {
    try {
      handler();
    } catch {
      /* handler errors must not break coordinator */
    }
  }
}

function onVisibilityChange(): void {
  if (typeof document === "undefined" || document.visibilityState !== "visible") return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(flushVisibilityHandlers, GESTIONALE_VISIBILITY_COORDINATOR_DEBOUNCE_MS);
}

function ensureListener(): void {
  if (listenerAttached || typeof document === "undefined") return;
  document.addEventListener("visibilitychange", onVisibilityChange);
  listenerAttached = true;
}

function maybeRemoveListener(): void {
  if (!listenerAttached || handlers.size > 0 || typeof document === "undefined") return;
  document.removeEventListener("visibilitychange", onVisibilityChange);
  listenerAttached = false;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

/** Registra handler tab-focus; un solo listener `visibilitychange` condiviso. */
export function registerGestionaleVisibilityHandler(handler: () => void): () => void {
  handlers.add(handler);
  ensureListener();
  return () => {
    handlers.delete(handler);
    maybeRemoveListener();
  };
}
