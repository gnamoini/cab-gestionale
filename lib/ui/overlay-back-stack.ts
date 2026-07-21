/**
 * Stack globale overlay + History API per intercettare il pulsante Indietro
 * (mobile / browser) e chiudere modali senza navigare via pagina.
 */

export const CAB_OVERLAY_HISTORY_KEY = "cabOverlay";
export const CAB_OVERLAY_OWNER = "overlay-back-stack" as const;

export type OverlayLayer = "navigation" | "drawer" | "selector" | "modal" | "confirm";

export const OverlayLayerPriority = {
  navigation: 100,
  drawer: 200,
  modal: 300,
  selector: 350,
  confirm: 400,
} as const;

export type OverlayLayerPriorityValue =
  (typeof OverlayLayerPriority)[keyof typeof OverlayLayerPriority];

export type OverlayCloseContext = {
  /** True quando la chiusura arriva dal pulsante Indietro / popstate (non da X o overlay click). */
  fromPopstate?: boolean;
};

export type BeforeBackHandler = (
  ctx?: OverlayCloseContext,
) => boolean | Promise<boolean>;

export type OverlayBackEntry = {
  id: number;
  source: string;
  onClose: (ctx?: OverlayCloseContext) => void;
  pushed: boolean;
  layer?: OverlayLayer;
  priority: OverlayLayerPriorityValue;
  blocksGestures: boolean;
  openedAt: number;
};

export type RegisterOverlayBackOptions = {
  layer?: OverlayLayer;
  priority?: OverlayLayerPriorityValue;
  /** Default true per navigation/drawer/modal/confirm; false per selector. */
  blocksGestures?: boolean;
  beforeBack?: BeforeBackHandler;
};

type CabOverlayHistoryState = {
  cabOverlay: true;
  overlayId: number;
  overlayOwner: typeof CAB_OVERLAY_OWNER;
  createdAt: number;
  cabOverlaySource?: string;
};

/** Legacy shape pre-ownership — non owned, solo heal. */
type CabOverlayLegacyHistoryState = {
  [CAB_OVERLAY_HISTORY_KEY]: number;
  cabOverlaySource?: string;
};

let overlayStack: OverlayBackEntry[] = [];
let nextOverlayId = 0;
let suppressedPopCount = 0;
let popstateListenerAttached = false;

const OVERLAY_HISTORY_MAX_AGE_MS = 30 * 60 * 1000;

function isLegacyCabOverlayState(state: unknown): state is CabOverlayLegacyHistoryState {
  return (
    typeof state === "object" &&
    state !== null &&
    typeof (state as CabOverlayLegacyHistoryState)[CAB_OVERLAY_HISTORY_KEY] === "number" &&
    (state as CabOverlayHistoryState).cabOverlay !== true
  );
}

function isCabOverlayOwnedState(state: unknown): state is CabOverlayHistoryState {
  return (
    typeof state === "object" &&
    state !== null &&
    (state as CabOverlayHistoryState).cabOverlay === true &&
    typeof (state as CabOverlayHistoryState).overlayId === "number" &&
    (state as CabOverlayHistoryState).overlayOwner === CAB_OVERLAY_OWNER
  );
}

function isAnyCabOverlayHistoryState(state: unknown): boolean {
  return isCabOverlayOwnedState(state) || isLegacyCabOverlayState(state);
}

export function isOwnedOverlayHistoryEntry(
  state: unknown,
  overlayId: number,
  maxAgeMs = OVERLAY_HISTORY_MAX_AGE_MS,
): boolean {
  if (!isCabOverlayOwnedState(state)) return false;
  if (state.overlayId !== overlayId) return false;
  if (state.overlayOwner !== CAB_OVERLAY_OWNER) return false;
  if (Date.now() - state.createdAt > maxAgeMs) return false;
  return true;
}

function defaultPriorityForLayer(layer?: OverlayLayer): OverlayLayerPriorityValue {
  if (!layer) return OverlayLayerPriority.modal;
  return OverlayLayerPriority[layer];
}

function defaultBlocksGesturesForLayer(layer?: OverlayLayer): boolean {
  return layer !== "selector";
}

function pushOverlayHistory(id: number, source: string): void {
  if (typeof window === "undefined") return;
  const state: CabOverlayHistoryState = {
    cabOverlay: true,
    overlayId: id,
    overlayOwner: CAB_OVERLAY_OWNER,
    createdAt: Date.now(),
    cabOverlaySource: source,
  };
  window.history.pushState(state, "", window.location.href);
}

function consumeOverlayHistoryEntry(): void {
  if (typeof window === "undefined") return;
  if (!isAnyCabOverlayHistoryState(window.history.state)) return;
  window.history.replaceState(null, "", window.location.href);
}

function backOverlayHistoryEntry(): void {
  if (typeof window === "undefined") return;
  suppressedPopCount += 1;
  window.history.back();
}

/** Rimuove voci history overlay orfane (refresh / bfcache) senza toccare la navigazione reale. */
export function healOverlayBackStack(reason = "heal"): void {
  if (typeof window === "undefined") return;
  if (overlayStack.length > 0) return;

  let guard = 0;
  while (isAnyCabOverlayHistoryState(window.history.state) && guard < 32) {
    window.history.replaceState(null, "", window.location.href);
    guard += 1;
    if (!isAnyCabOverlayHistoryState(window.history.state)) break;
  }
  void reason;
}

export function getOverlayBackStackDepth(): number {
  return overlayStack.length;
}

/** True se un overlay registrato blocca gesture pagina (PTR, edge swipe). */
export function isBlockingOverlayVisible(): boolean {
  return overlayStack.some((e) => e.blocksGestures);
}

export function resetOverlayBackStack(reason = "reset"): void {
  overlayStack = [];
  suppressedPopCount = 0;
  healOverlayBackStack(reason);
}

function findEntryIndex(id: number): number {
  return overlayStack.findIndex((e) => e.id === id);
}

/** Target Indietro: priorità più alta; a parità, ultimo aperto. */
function resolveBackTargetIndex(): number {
  if (overlayStack.length === 0) return -1;

  let bestIdx = 0;
  let best = overlayStack[0]!;

  for (let i = 1; i < overlayStack.length; i++) {
    const entry = overlayStack[i]!;
    if (
      entry.priority > best.priority ||
      (entry.priority === best.priority && entry.id > best.id)
    ) {
      best = entry;
      bestIdx = i;
    }
  }

  return bestIdx;
}

function isBackTargetEntry(id: number): boolean {
  const idx = resolveBackTargetIndex();
  if (idx < 0) return false;
  return overlayStack[idx]?.id === id;
}

function unregisterOverlayBack(id: number, opts?: { syncHistory?: boolean }): void {
  const idx = findEntryIndex(id);
  if (idx < 0) return;

  const entry = overlayStack[idx]!;
  const wasBackTarget = isBackTargetEntry(id);
  overlayStack.splice(idx, 1);

  if (opts?.syncHistory && entry.pushed && wasBackTarget && typeof window !== "undefined") {
    if (isOwnedOverlayHistoryEntry(window.history.state, entry.id)) {
      backOverlayHistoryEntry();
    } else {
      consumeOverlayHistoryEntry();
    }
  }
}

/** Gestisce popstate da pulsante Indietro / swipe iOS. */
export function handleOverlayBackPopState(): boolean {
  if (suppressedPopCount > 0) {
    suppressedPopCount -= 1;
    return true;
  }

  const idx = resolveBackTargetIndex();
  if (idx < 0) return false;

  const entry = overlayStack[idx]!;
  overlayStack.splice(idx, 1);

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

function insertOverlayEntry(entry: OverlayBackEntry): void {
  overlayStack.push(entry);
}

export function registerOverlayBack(
  onClose: (ctx?: OverlayCloseContext) => void,
  source = "overlay",
  opts?: RegisterOverlayBackOptions,
): () => void {
  if (typeof window === "undefined") return () => {};

  const id = ++nextOverlayId;
  const layer = opts?.layer;
  const entry: OverlayBackEntry = {
    id,
    source,
    onClose,
    pushed: false,
    layer,
    priority: opts?.priority ?? defaultPriorityForLayer(layer),
    blocksGestures: opts?.blocksGestures ?? defaultBlocksGesturesForLayer(layer),
    openedAt: Date.now(),
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
  opts?: Pick<RegisterOverlayBackOptions, "layer" | "priority" | "blocksGestures" | "beforeBack">,
): void {
  if (cleanupRef.current) return;
  cleanupRef.current = registerOverlayBack(onClose, source, {
    layer: opts?.layer ?? "modal",
    priority: opts?.priority ?? OverlayLayerPriority.modal,
    ...opts,
  });
}

export function clearOverlayBackResync(cleanupRef: OverlayBackResyncRef): void {
  cleanupRef.current?.();
  cleanupRef.current = null;
}

/** Test-only: reset stato modulo. */
export function __resetOverlayBackStackForTests(): void {
  overlayStack = [];
  nextOverlayId = 0;
  suppressedPopCount = 0;
  popstateListenerAttached = false;
}

/** Test-only: imposta suppress counter. */
export function __setSuppressedPopCountForTests(value: number): void {
  suppressedPopCount = value;
}

/** @deprecated Usare __setSuppressedPopCountForTests */
export function __setSuppressNextPopForTests(value: boolean): void {
  suppressedPopCount = value ? 1 : 0;
}

/** Test-only: lettura stack. */
export function __getOverlayBackStackForTests(): readonly OverlayBackEntry[] {
  return overlayStack;
}

/** Test-only: lettura suppress counter. */
export function __getSuppressedPopCountForTests(): number {
  return suppressedPopCount;
}
