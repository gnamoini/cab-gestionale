/**
 * Stack globale overlay + History API per intercettare il pulsante Indietro
 * (mobile / browser) e chiudere modali senza navigare via pagina.
 */

export const CAB_OVERLAY_HISTORY_KEY = "cabOverlay";

export type OverlayLayer = "modal" | "drawer" | "selector";

export type OverlayCloseContext = {
  /** True quando la chiusura arriva dal pulsante Indietro / popstate (non da X o overlay click). */
  fromPopstate?: boolean;
};

export type OverlayBackEntry = {
  id: number;
  source: string;
  onClose: (ctx?: OverlayCloseContext) => void;
  pushed: boolean;
  layer?: OverlayLayer;
};

export type RegisterOverlayBackOptions = {
  layer?: OverlayLayer;
};

type CabOverlayHistoryState = {
  [CAB_OVERLAY_HISTORY_KEY]: number;
  cabOverlaySource?: string;
};

let overlayStack: OverlayBackEntry[] = [];
let nextOverlayId = 0;
let suppressNextPop = false;
let popstateListenerAttached = false;

function isCabOverlayState(state: unknown): state is CabOverlayHistoryState {
  return (
    typeof state === "object" &&
    state !== null &&
    typeof (state as CabOverlayHistoryState)[CAB_OVERLAY_HISTORY_KEY] === "number"
  );
}

function pushOverlayHistory(id: number, source: string): void {
  if (typeof window === "undefined") return;
  const state: CabOverlayHistoryState = {
    [CAB_OVERLAY_HISTORY_KEY]: id,
    cabOverlaySource: source,
  };
  window.history.pushState(state, "", window.location.href);
}

/**
 * Chiusura programmatica overlay (X, Salva, Annulla): replaceState in-place.
 * Evita navigazione indesiderata verso la route precedente (Next.js + voci history orfane).
 * Il pulsante Indietro del browser resta gestito da popstate + handleOverlayBackPopState.
 */
function consumeOverlayHistoryEntry(): void {
  if (typeof window === "undefined") return;
  if (!isCabOverlayState(window.history.state)) return;
  window.history.replaceState(null, "", window.location.href);
}

/** Rimuove voci history overlay orfane (refresh / bfcache) senza toccare la navigazione reale. */
export function healOverlayBackStack(reason = "heal"): void {
  if (typeof window === "undefined") return;
  if (overlayStack.length > 0) return;

  let guard = 0;
  while (isCabOverlayState(window.history.state) && guard < 32) {
    window.history.replaceState(null, "", window.location.href);
    guard += 1;
    if (!isCabOverlayState(window.history.state)) break;
  }
  void reason;
}

export function getOverlayBackStackDepth(): number {
  return overlayStack.length;
}

export function resetOverlayBackStack(reason = "reset"): void {
  overlayStack = [];
  suppressNextPop = false;
  healOverlayBackStack(reason);
}

function findEntryIndex(id: number): number {
  return overlayStack.findIndex((e) => e.id === id);
}

function unregisterOverlayBack(id: number, opts?: { syncHistory?: boolean }): void {
  const idx = findEntryIndex(id);
  if (idx < 0) return;

  const entry = overlayStack[idx]!;
  const wasTop = idx === overlayStack.length - 1;
  overlayStack.splice(idx, 1);

  if (opts?.syncHistory && entry.pushed && wasTop && typeof window !== "undefined") {
    consumeOverlayHistoryEntry();
  }
}

/** Gestisce popstate da pulsante Indietro / swipe iOS. */
export function handleOverlayBackPopState(): boolean {
  if (suppressNextPop) {
    suppressNextPop = false;
    return true;
  }

  const entry = overlayStack.pop();
  if (!entry) return false;

  try {
    entry.onClose({ fromPopstate: true });
  } catch {
    // onClose può smontare React — non propagare
  }
  return true;
}

export function attachOverlayBackPopStateListener(): () => void {
  if (typeof window === "undefined") return () => {};
  if (popstateListenerAttached) return () => {};

  const onPopState = () => {
    handleOverlayBackPopState();
  };

  window.addEventListener("popstate", onPopState);
  popstateListenerAttached = true;

  return () => {
    window.removeEventListener("popstate", onPopState);
    popstateListenerAttached = false;
  };
}

/**
 * Registra un overlay nello stack e aggiunge una voce history fittizia.
 * Ritorna unregister idempotente.
 */
function insertOverlayEntry(entry: OverlayBackEntry): void {
  if (!entry.layer) {
    overlayStack.push(entry);
    return;
  }
  if (entry.layer === "selector") {
    let insertAt = overlayStack.length;
    for (let i = overlayStack.length - 1; i >= 0; i--) {
      const layer = overlayStack[i]?.layer;
      if (layer === "modal" || layer === "drawer") {
        insertAt = i + 1;
        break;
      }
      if (!layer) {
        insertAt = i;
      }
    }
    overlayStack.splice(insertAt, 0, entry);
    return;
  }
  overlayStack.push(entry);
}

export function registerOverlayBack(
  onClose: (ctx?: OverlayCloseContext) => void,
  source = "overlay",
  opts?: RegisterOverlayBackOptions,
): () => void {
  if (typeof window === "undefined") return () => {};

  const id = ++nextOverlayId;
  const entry: OverlayBackEntry = {
    id,
    source,
    onClose,
    pushed: false,
    layer: opts?.layer,
  };

  pushOverlayHistory(id, source);
  entry.pushed = true;
  insertOverlayEntry(entry);

  let released = false;
  return () => {
    if (released) return;
    released = true;
    unregisterOverlayBack(id, { syncHistory: true });
  };
}

type OverlayBackResyncRef = { current: (() => void) | null };

/** Ripristina stack/history dopo Indietro che non ha chiuso l'overlay (es. dialog unsaved). */
export function ensureOverlayBackResync(
  cleanupRef: OverlayBackResyncRef,
  onClose: (ctx?: OverlayCloseContext) => void,
  source: string,
): void {
  if (cleanupRef.current) return;
  cleanupRef.current = registerOverlayBack(onClose, source, { layer: "modal" });
}

export function clearOverlayBackResync(cleanupRef: OverlayBackResyncRef): void {
  cleanupRef.current?.();
  cleanupRef.current = null;
}

/** Test-only: reset stato modulo. */
export function __resetOverlayBackStackForTests(): void {
  overlayStack = [];
  nextOverlayId = 0;
  suppressNextPop = false;
  popstateListenerAttached = false;
}

/** Test-only: imposta suppress flag. */
export function __setSuppressNextPopForTests(value: boolean): void {
  suppressNextPop = value;
}

/** Test-only: lettura stack. */
export function __getOverlayBackStackForTests(): readonly OverlayBackEntry[] {
  return overlayStack;
}
