/**
 * Single source of truth per body scroll lock.
 * Nessun altro modulo deve scrivere overflow/touch-action su html/body per le modali.
 */

export const BODY_LOCK_ATTR = "data-cab-scroll-lock-count";
const BODY_LOCK_SCROLL_Y = "data-cab-scroll-lock-y";

type LockEntry = { id: number; source: string; epoch: number };

let lockStack: LockEntry[] = [];
let lockEpoch = 0;
let nextLockId = 0;
let savedScrollY = 0;
let useFixedLock = false;
let healTimer: ReturnType<typeof setTimeout> | null = null;

function isIosLikeSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function syncLockAttr(): void {
  if (typeof document === "undefined") return;
  if (lockStack.length <= 0) {
    document.body.removeAttribute(BODY_LOCK_ATTR);
    return;
  }
  document.body.setAttribute(BODY_LOCK_ATTR, String(lockStack.length));
}

function isDomScrollLocked(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.style.overflow === "hidden" ||
    document.body.style.overflow === "hidden" ||
    document.body.style.touchAction === "none" ||
    document.body.style.position === "fixed"
  );
}

/** Rimuove sempre tutti gli stili imposti dal lock — mai restore a "hidden". */
export function clearBodyScrollLockStyles(): void {
  if (typeof document === "undefined") return;

  const scrollY = savedScrollY;
  const hadFixed = useFixedLock;

  document.documentElement.style.overflow = "";
  document.documentElement.style.touchAction = "";
  document.body.style.overflow = "";
  document.body.style.touchAction = "";
  document.body.style.paddingRight = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  document.body.removeAttribute(BODY_LOCK_SCROLL_Y);

  if (hadFixed && Number.isFinite(scrollY)) {
    window.scrollTo(0, scrollY);
  }

  useFixedLock = false;
  savedScrollY = 0;
}

function applyBodyScrollLock(): void {
  const gap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  document.body.style.overflow = "hidden";
  if (gap > 0) document.body.style.paddingRight = `${gap}px`;

  if (useFixedLock) {
    document.body.style.touchAction = "none";
    document.body.setAttribute(BODY_LOCK_SCROLL_Y, String(savedScrollY));
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "";
  }
}

function scheduleAutoHeal(): void {
  if (typeof window === "undefined") return;
  if (healTimer != null) clearTimeout(healTimer);
  healTimer = setTimeout(() => {
    healTimer = null;
    if (lockStack.length !== 0) return;
    if (!isDomScrollLocked()) return;
    clearBodyScrollLockStyles();
    syncLockAttr();
  }, 200);
}

/** Acquisisce un lock. Ritorna release idempotente (safe per double cleanup). */
export function acquireBodyScrollLock(source?: string): () => void {
  if (typeof document === "undefined") return () => {};

  const epoch = lockEpoch;
  const id = ++nextLockId;

  if (lockStack.length === 0) {
    savedScrollY = window.scrollY;
    useFixedLock = isIosLikeSafari();
    applyBodyScrollLock();
  }

  lockStack.push({ id, source: source ?? "unknown", epoch });
  syncLockAttr();
  debugScrollLockLog("acquire", { source: source ?? "unknown", count: lockStack.length, useFixedLock }, "H1");

  let released = false;
  return () => {
    if (released) return;
    released = true;
    releaseBodyScrollLock(id, epoch);
  };
}

function releaseBodyScrollLock(lockId: number, epoch: number): void {
  if (epoch !== lockEpoch) return;

  lockStack = lockStack.filter((entry) => entry.id !== lockId);
  syncLockAttr();

  if (lockStack.length === 0) {
    clearBodyScrollLockStyles();
    scheduleAutoHeal();
  }
  debugScrollLockLog("release", { lockId, remaining: lockStack.length }, "H1");
}

/** Pulisce lock fantasma: stack vuoto ma stili inline o attr residui. */
export function healBodyScrollLockState(_reason?: string): void {
  if (typeof document === "undefined") return;
  if (lockStack.length > 0) return;

  const attr = document.body.getAttribute(BODY_LOCK_ATTR);
  if (attr) {
    document.body.removeAttribute(BODY_LOCK_ATTR);
  }
  if (isDomScrollLocked()) {
    clearBodyScrollLockStyles();
  }
  syncLockAttr();
}
/** Reset totale — route change, error boundary, stuck probe. */
export function forceReleaseAllBodyScrollLocks(_reason?: string): void {
  if (typeof document === "undefined") return;
  lockEpoch += 1;
  lockStack = [];
  clearBodyScrollLockStyles();
  syncLockAttr();
  scheduleAutoHeal();
}

export function getBodyScrollLockCount(): number {
  return lockStack.length;
}

export function getBodyScrollLockDebugState(): {
  count: number;
  sources: string[];
  useFixedLock: boolean;
} {
  return {
    count: lockStack.length,
    sources: lockStack.map((entry) => entry.source),
    useFixedLock,
  };
}

function debugScrollLockLog(message: string, data: Record<string, unknown>, hypothesisId: string) {
  if (typeof window === "undefined") return;
  // #region agent log
  fetch("http://127.0.0.1:7662/ingest/191e4801-c810-4957-b192-301c6ab4b769", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b1d6c0" },
    body: JSON.stringify({
      sessionId: "b1d6c0",
      runId: "scroll-lock",
      hypothesisId,
      location: "body-scroll-lock-manager.ts",
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

export function probeBodyScrollLockStuck(): boolean {
  if (typeof document === "undefined") return false;
  const attr = document.body.getAttribute(BODY_LOCK_ATTR);
  const stuck = lockStack.length === 0 && !attr && isDomScrollLocked();
  if (!stuck) return false;
  forceReleaseAllBodyScrollLocks("stuck-probe");
  return true;
}

import { syncAppViewportFill } from "@/lib/ui/viewport-fill-sync";

/** Re-applica lock attivo o cura stili fantasma dopo resize/orientationchange. */
export function refreshBodyScrollLockOnViewportChange(reason = "viewport-resize"): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  syncAppViewportFill();
  if (lockStack.length > 0) {
    applyBodyScrollLock();
    debugScrollLockLog(
      "viewport-refresh",
      { reason, count: lockStack.length, useFixedLock, innerWidth: window.innerWidth },
      "H1",
    );
    return;
  }
  healBodyScrollLockState(reason);
  probeBodyScrollLockStuck();
}
