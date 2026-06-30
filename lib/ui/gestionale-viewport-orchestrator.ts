/**
 * Orchestratore viewport unico — un listener visualViewport condiviso da focus scroll,
 * keyboard pad modali, dropdown reposition e body-scroll-lock heal.
 */

import { computeKeyboardInset, syncKeyboardCssVars } from "@/lib/ui/mobile-modal-behavior";
import { syncAppViewportFill } from "@/lib/ui/viewport-fill-sync";
import { isBootInvestigationEnabled, logBoot } from "@/lib/observability/boot-investigation";

export type ViewportChangeReason = "resize" | "scroll" | "orientation" | "window-resize";

export type ViewportSnapshot = {
  keyboardInset: number;
  vvHeight: number;
  vvOffsetTop: number;
};

type ViewportSubscriber = (snapshot: ViewportSnapshot, reason: ViewportChangeReason) => void;

const STABLE_FRAMES_REQUIRED = 2;
const STABLE_MAX_FRAMES = 12;

let mounted = false;
let subscriberId = 0;
const subscribers = new Map<number, ViewportSubscriber>();
let rafCoalesce: number | null = null;
let pendingReason: ViewportChangeReason = "resize";
let vvSyncCount = 0;
let vvSyncWindowStart = 0;

type StableWaiter = {
  stableFrames: number;
  maxFrames: number;
  lastInset: number;
  resolve: () => void;
};

const stableWaiters: StableWaiter[] = [];

function getVvMetrics(): { height: number; offsetTop: number } {
  if (typeof window === "undefined") return { height: 0, offsetTop: 0 };
  const vv = window.visualViewport;
  if (!vv) return { height: window.innerHeight, offsetTop: 0 };
  return { height: vv.height, offsetTop: vv.offsetTop };
}

export function getViewportSnapshot(): ViewportSnapshot {
  const { height, offsetTop } = getVvMetrics();
  return {
    keyboardInset: computeKeyboardInset(),
    vvHeight: Math.round(height),
    vvOffsetTop: Math.round(offsetTop),
  };
}

function notifySubscribers(reason: ViewportChangeReason): void {
  const snapshot = getViewportSnapshot();
  for (const cb of subscribers.values()) {
    try {
      cb(snapshot, reason);
    } catch {
      /* ignore subscriber errors */
    }
  }
}

function processStableWaiters(snapshot: ViewportSnapshot): void {
  for (let i = stableWaiters.length - 1; i >= 0; i--) {
    const waiter = stableWaiters[i]!;
    waiter.maxFrames -= 1;
    if (snapshot.keyboardInset === waiter.lastInset) {
      waiter.stableFrames += 1;
    } else {
      waiter.stableFrames = 0;
      waiter.lastInset = snapshot.keyboardInset;
    }
    if (waiter.stableFrames >= STABLE_FRAMES_REQUIRED || waiter.maxFrames <= 0) {
      waiter.resolve();
      stableWaiters.splice(i, 1);
    }
  }
}

function runViewportSync(reason: ViewportChangeReason): void {
  syncKeyboardCssVars();
  syncAppViewportFill();
  const snapshot = getViewportSnapshot();
  notifySubscribers(reason);
  processStableWaiters(snapshot);

  if (isBootInvestigationEnabled()) {
    vvSyncCount += 1;
    const now = Date.now();
    if (vvSyncWindowStart === 0) vvSyncWindowStart = now;
    if (now - vvSyncWindowStart >= 1000) {
      if (vvSyncCount > 5) {
        logBoot("RENDER", "vv_sync", { syncPerSec: vvSyncCount, reason: pendingReason }, "high_sync_rate");
      }
      vvSyncCount = 0;
      vvSyncWindowStart = now;
    } else if (vvSyncCount === 1) {
      logBoot("RENDER", "vv_sync", { reason, ...snapshot });
    }
  }
}

function scheduleViewportSync(reason: ViewportChangeReason): void {
  pendingReason = reason;
  if (rafCoalesce != null) return;
  rafCoalesce = window.requestAnimationFrame(() => {
    rafCoalesce = null;
    runViewportSync(pendingReason);
  });
}

function ensureGestionaleViewportOrchestrator(): void {
  if (mounted || typeof window === "undefined") return;
  mounted = true;

  const vv = window.visualViewport;
  const onVvResize = () => scheduleViewportSync("resize");
  const onVvScroll = () => scheduleViewportSync("scroll");
  const onOrientation = () => scheduleViewportSync("orientation");
  const onWindowResize = () => scheduleViewportSync("window-resize");

  vv?.addEventListener("resize", onVvResize);
  vv?.addEventListener("scroll", onVvScroll);
  window.addEventListener("orientationchange", onOrientation);
  window.addEventListener("resize", onWindowResize, { passive: true });

  runViewportSync("resize");
}

/**
 * Sottoscrizione eventi viewport — un solo listener globale indipendentemente dai consumer.
 */
export function subscribeGestionaleViewport(callback: ViewportSubscriber): () => void {
  ensureGestionaleViewportOrchestrator();
  const id = ++subscriberId;
  subscribers.set(id, callback);
  callback(getViewportSnapshot(), "resize");
  return () => {
    subscribers.delete(id);
  };
}

/**
 * Attende stabilizzazione inset tastiera (2 frame consecutivi invariati, cap 12 frame).
 * Usato dopo focus scroll — non è un delay UX arbitrario.
 */
export function waitForViewportStable(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  ensureGestionaleViewportOrchestrator();
  return new Promise((resolve) => {
    stableWaiters.push({
      stableFrames: 0,
      maxFrames: STABLE_MAX_FRAMES,
      lastInset: getViewportSnapshot().keyboardInset,
      resolve,
    });
    scheduleViewportSync("resize");
  });
}

/** Mount esplicito (opzionale — avviene anche al primo subscribe). */
export function mountGestionaleViewportOrchestrator(): void {
  ensureGestionaleViewportOrchestrator();
}

/** Solo test — reset stato modulo. */
export function resetGestionaleViewportOrchestratorForTests(): void {
  subscribers.clear();
  stableWaiters.length = 0;
  mounted = false;
  if (rafCoalesce != null) {
    window.cancelAnimationFrame(rafCoalesce);
    rafCoalesce = null;
  }
}
