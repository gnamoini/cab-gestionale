export type PwaUpdateState = "idle" | "available" | "applying";

export const PWA_SKIP_WAITING_MESSAGE = { type: "SKIP_WAITING" } as const;

/** sessionStorage: assente = cold start (prima load tab/sessione). */
export const PWA_SESSION_ACTIVE_KEY = "pwa-session-active";

/** Finestra post-load: notifica warm solo dopo bootstrap. */
export const PWA_UPDATE_BOOTSTRAP_MS = 2_000;

function resolveSessionStorage(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage;
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}

export function isColdStartSession(storage?: Storage | null): boolean {
  const s = resolveSessionStorage(storage);
  if (!s) return false;
  return !s.getItem(PWA_SESSION_ACTIVE_KEY);
}

export function isNavigationReload(): boolean {
  if (typeof performance === "undefined") return false;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload";
}

export function markPwaSessionActive(storage?: Storage | null): void {
  resolveSessionStorage(storage)?.setItem(PWA_SESSION_ACTIVE_KEY, "1");
}

export function shouldNotifyServiceWorkerUpdateAfterBootstrap(
  subscribedAtMs: number,
  nowMs = performance.now(),
): boolean {
  return nowMs - subscribedAtMs >= PWA_UPDATE_BOOTSTRAP_MS;
}

export function getWaitingServiceWorker(
  registration: ServiceWorkerRegistration,
): ServiceWorker | null {
  return registration.waiting ?? null;
}

export function applyServiceWorkerUpdate(registration: ServiceWorkerRegistration): void {
  const waiting = getWaitingServiceWorker(registration);
  waiting?.postMessage(PWA_SKIP_WAITING_MESSAGE);
}

/** Cold start o reload: applica subito se c'è un SW in attesa. */
export function tryAutoApplyOnColdStart(
  registration: ServiceWorkerRegistration,
  storage?: Storage | null,
): boolean {
  if (!isColdStartSession(storage) && !isNavigationReload()) return false;
  if (!getWaitingServiceWorker(registration)) return false;
  applyServiceWorkerUpdate(registration);
  return true;
}

function notifyOrAutoApplyOnUpdate(
  registration: ServiceWorkerRegistration,
  onUpdateAvailable: () => void,
  subscribedAtMs: number,
  storage?: Storage | null,
): void {
  if (!getWaitingServiceWorker(registration)) return;
  if (tryAutoApplyOnColdStart(registration, storage)) return;
  if (!shouldNotifyServiceWorkerUpdateAfterBootstrap(subscribedAtMs)) return;
  onUpdateAvailable();
}

export function subscribeToServiceWorkerUpdates(
  registration: ServiceWorkerRegistration,
  onUpdateAvailable: () => void,
  options?: { subscribedAtMs?: number; storage?: Storage | null },
): () => void {
  const subscribedAtMs = options?.subscribedAtMs ?? performance.now();
  const storage = options?.storage;

  const notifyIfRuntimeUpdate = () => {
    notifyOrAutoApplyOnUpdate(registration, onUpdateAvailable, subscribedAtMs, storage);
  };

  const onUpdateFound = () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener("statechange", () => {
      if (installing.state !== "installed") return;
      if (!navigator.serviceWorker.controller) return;
      notifyIfRuntimeUpdate();
    });
  };

  registration.addEventListener("updatefound", onUpdateFound);
  return () => registration.removeEventListener("updatefound", onUpdateFound);
}

/** Register + update check: auto-apply cold start, altrimenti segna sessione warm. */
export async function bootstrapServiceWorkerUpdateFlow(
  registration: ServiceWorkerRegistration,
  onUpdateAvailable: () => void,
  subscribedAtMs: number,
  storage?: Storage | null,
): Promise<(() => void) | null> {
  if (tryAutoApplyOnColdStart(registration, storage)) return null;
  try {
    await registration.update();
  } catch {
    /* best effort */
  }
  if (tryAutoApplyOnColdStart(registration, storage)) return null;
  markPwaSessionActive(storage);
  return subscribeToServiceWorkerUpdates(registration, onUpdateAvailable, { subscribedAtMs, storage });
}

/** Controllo esplicito runtime (es. visibility) — mai al bootstrap iniziale. */
export async function refreshServiceWorkerUpdateCheck(
  registration: ServiceWorkerRegistration,
  subscribedAtMs: number,
): Promise<void> {
  if (!shouldNotifyServiceWorkerUpdateAfterBootstrap(subscribedAtMs)) return;
  try {
    await registration.update();
  } catch {
    /* best effort */
  }
}
