/**
 * Single source of truth per body scroll lock.
 * Nessun altro modulo deve scrivere overflow/touch-action su html/body per le modali.
 */

export const BODY_LOCK_ATTR = "data-cab-scroll-lock-count";
const BODY_LOCK_SCROLL_Y = "data-cab-scroll-lock-y";
const MAIN_SCROLL_SELECTOR = "main.gestionale-scroll-y";

type LockEntry = { id: number; source: string; epoch: number };

let lockStack: LockEntry[] = [];
let lockEpoch = 0;
let nextLockId = 0;
let savedScrollY = 0;
let useFixedLock = false;
let healTimer: ReturnType<typeof setTimeout> | null = null;

let mainLockCount = 0;
let savedMainScrollTop = 0;
let savedMainOverflow = "";

function isIosLikeSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isGestionaleAppShell(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector(".cab-app-shell"));
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

function clearMainScrollLockStyles(): void {
  if (typeof document === "undefined") return;
  const main = document.querySelector(MAIN_SCROLL_SELECTOR) as HTMLElement | null;
  if (!main) return;
  main.style.overflow = savedMainOverflow;
  main.scrollTop = savedMainScrollTop;
  main.removeAttribute("data-cab-main-scroll-lock");
  mainLockCount = 0;
}

function documentHasVerticalScroll(): boolean {
  const html = document.documentElement;
  return html.scrollHeight > html.clientHeight + 1;
}

function shouldCompensateScrollbarGap(): boolean {
  if (isGestionaleAppShell()) return false;
  const gap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  if (gap <= 0) return false;
  return documentHasVerticalScroll();
}

function applyBodyScrollLock(): void {
  document.body.style.overflow = "hidden";
  if (shouldCompensateScrollbarGap()) {
    const gap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.body.style.paddingRight = `${gap}px`;
  }

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

function applyMainScrollLock(source?: string): void {
  const main = document.querySelector(MAIN_SCROLL_SELECTOR) as HTMLElement | null;
  if (!main) return;
  if (mainLockCount === 0) {
    savedMainScrollTop = main.scrollTop;
    savedMainOverflow = main.style.overflow;
    main.style.overflow = "hidden";
  }
  mainLockCount += 1;
  if (source) main.setAttribute("data-cab-main-scroll-lock", source);
}

function releaseMainScrollLock(): void {
  const main = document.querySelector(MAIN_SCROLL_SELECTOR) as HTMLElement | null;
  if (!main || mainLockCount <= 0) return;
  mainLockCount -= 1;
  if (mainLockCount === 0) {
    main.style.overflow = savedMainOverflow;
    main.scrollTop = savedMainScrollTop;
    main.removeAttribute("data-cab-main-scroll-lock");
  }
}

/** Lock scroll su main gestionale (ref-count). Scroll interno app shell, senza padding body. */
export function acquireMainScrollLock(source?: string): () => void {
  if (typeof document === "undefined") return () => {};
  applyMainScrollLock(source);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    releaseMainScrollLock();
  };
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
  const lockMain = isGestionaleAppShell();

  if (lockStack.length === 0) {
    savedScrollY = window.scrollY;
    useFixedLock = isIosLikeSafari();
    applyBodyScrollLock();
    if (lockMain) applyMainScrollLock(source);
  } else if (lockMain) {
    applyMainScrollLock(source);
  }

  lockStack.push({ id, source: source ?? "unknown", epoch });
  syncLockAttr();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    releaseBodyScrollLock(id, epoch, lockMain);
  };
}

function releaseBodyScrollLock(lockId: number, epoch: number, hadMainLock: boolean): void {
  if (epoch !== lockEpoch) return;

  lockStack = lockStack.filter((entry) => entry.id !== lockId);
  syncLockAttr();

  if (hadMainLock) releaseMainScrollLock();

  if (lockStack.length === 0) {
    clearBodyScrollLockStyles();
    scheduleAutoHeal();
  }
}

/** Pulisce lock fantasma: stack vuoto ma stili inline o attr residui. */
export function healBodyScrollLockState(_reason?: string): void {
  if (typeof document === "undefined") return;
  if (lockStack.length > 0) return;

  const attr = document.body.getAttribute(BODY_LOCK_ATTR);
  const hadAttr = Boolean(attr);
  const wasDomLocked = isDomScrollLocked();
  if (attr) {
    document.body.removeAttribute(BODY_LOCK_ATTR);
  }
  if (wasDomLocked) {
    clearBodyScrollLockStyles();
  }
  const main = document.querySelector(MAIN_SCROLL_SELECTOR) as HTMLElement | null;
  const hadMainLock = mainLockCount === 0 && main?.style.overflow === "hidden";
  if (hadMainLock && main) {
    main.style.overflow = "";
    main.removeAttribute("data-cab-main-scroll-lock");
  }
  syncLockAttr();
}
/** Reset totale — route change, error boundary, stuck probe. */
export function forceReleaseAllBodyScrollLocks(_reason?: string): void {
  if (typeof document === "undefined") return;
  lockEpoch += 1;
  lockStack = [];
  clearBodyScrollLockStyles();
  clearMainScrollLockStyles();
  syncLockAttr();
  scheduleAutoHeal();
}

export function getBodyScrollLockCount(): number {
  return lockStack.length;
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
    return;
  }
  healBodyScrollLockState(reason);
  probeBodyScrollLockStuck();
}
