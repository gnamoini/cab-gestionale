/**
 * Orchestratore viewport unico — un listener visualViewport condiviso da focus scroll,
 * keyboard pad modali, dropdown reposition e body-scroll-lock heal.
 */

import {
  computeKeyboardInset,
  syncFocusVisibilityCssVars,
} from "@/lib/ui/mobile-modal-behavior";
import { syncAppViewportFill } from "@/lib/ui/viewport-fill-sync";
import { isBootInvestigationEnabled, logBoot } from "@/lib/observability/boot-investigation";

export type ViewportChangeReason = "resize" | "scroll" | "orientation" | "window-resize";

export type ViewportSnapshot = {
  keyboardInset: number;
  vvHeight: number;
  vvOffsetTop: number;
};

export type WaitForViewportStableOptions = {
  signal?: AbortSignal;
  stableFrames?: number;
  quietPeriod?: number;
  timeout?: number;
};

type ViewportSubscriber = (snapshot: ViewportSnapshot, reason: ViewportChangeReason) => void;

const DEFAULT_STABLE_FRAMES = 2;
const DEFAULT_QUIET_PERIOD_MS = 80;
const DEFAULT_TIMEOUT_MS = 500;
const STABLE_MAX_FRAMES = 12;

let mounted = false;
let subscriberId = 0;
const subscribers = new Map<number, ViewportSubscriber>();
let rafCoalesce: number | null = null;
let pendingReason: ViewportChangeReason = "resize";
let vvSyncCount = 0;
let vvSyncWindowStart = 0;

function snapshotKey(snapshot: ViewportSnapshot): string {
  return `${snapshot.keyboardInset}:${snapshot.vvHeight}:${snapshot.vvOffsetTop}`;
}

type StableWaiter = {
  stableFrames: number;
  stableFramesRequired: number;
  maxFrames: number;
  lastKey: string;
  quietSince: number;
  quietPeriodMs: number;
  timeoutAt: number;
  signal?: AbortSignal;
  resolve: () => void;
  reject: (err: Error) => void;
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
  const now = Date.now();
  const key = snapshotKey(snapshot);

  for (let i = stableWaiters.length - 1; i >= 0; i--) {
    const waiter = stableWaiters[i]!;
    if (waiter.signal?.aborted) {
      waiter.reject(new DOMException("Aborted", "AbortError"));
      stableWaiters.splice(i, 1);
      continue;
    }

    waiter.maxFrames -= 1;

    if (key === waiter.lastKey) {
      waiter.stableFrames += 1;
    } else {
      waiter.stableFrames = 0;
      waiter.lastKey = key;
      waiter.quietSince = now;
    }

    const quietElapsed = now - waiter.quietSince;
    const frameStable = waiter.stableFrames >= waiter.stableFramesRequired;
    const quietStable = quietElapsed >= waiter.quietPeriodMs && waiter.stableFrames >= 1;
    const timedOut = now >= waiter.timeoutAt || waiter.maxFrames <= 0;

    if (frameStable || quietStable || timedOut) {
      waiter.resolve();
      stableWaiters.splice(i, 1);
    }
  }
}

function runViewportSync(reason: ViewportChangeReason): void {
  syncFocusVisibilityCssVars();
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
 * Attende stabilizzazione viewport: tuple invariata per quietPeriod OPPURE timeout.
 */
export function waitForViewportStable(options: WaitForViewportStableOptions = {}): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  ensureGestionaleViewportOrchestrator();

  const {
    signal,
    stableFrames = DEFAULT_STABLE_FRAMES,
    quietPeriod = DEFAULT_QUIET_PERIOD_MS,
    timeout = DEFAULT_TIMEOUT_MS,
  } = options;

  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  return new Promise((resolve, reject) => {
    const now = Date.now();
    const snapshot = getViewportSnapshot();
    const waiter: StableWaiter = {
      stableFrames: 0,
      stableFramesRequired: stableFrames,
      maxFrames: STABLE_MAX_FRAMES,
      lastKey: snapshotKey(snapshot),
      quietSince: now,
      quietPeriodMs: quietPeriod,
      timeoutAt: now + timeout,
      signal,
      resolve,
      reject,
    };

    const onAbort = () => {
      const idx = stableWaiters.indexOf(waiter);
      if (idx >= 0) stableWaiters.splice(idx, 1);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    stableWaiters.push(waiter);
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
