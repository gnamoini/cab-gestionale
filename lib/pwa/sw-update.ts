export type PwaUpdateState = "idle" | "available" | "applying";

export const PWA_SKIP_WAITING_MESSAGE = { type: "SKIP_WAITING" } as const;

/** sessionStorage: assente = cold start (prima load tab/sessione). */
export const PWA_SESSION_ACTIVE_KEY = "pwa-session-active";

/** sessionStorage: bootstrap SW in corso — auto-apply invece del banner. */
export const PWA_BOOTSTRAP_PENDING_KEY = "pwa-bootstrap-pending";

/** Finestra post-load: notifica warm solo dopo bootstrap. */
export const PWA_UPDATE_BOOTSTRAP_MS = 2_000;

/** Attesa installazione SW iniziale post-update(). */
export const PWA_UPDATE_SETTLE_TIMEOUT_MS = 8_000;

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

export function isPwaBootstrapPending(storage?: Storage | null): boolean {
  const s = resolveSessionStorage(storage);
  if (!s) return false;
  return !!s.getItem(PWA_BOOTSTRAP_PENDING_KEY);
}

export function isNavigationReload(): boolean {
  if (typeof performance === "undefined") return false;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload";
}

export function markPwaSessionActive(storage?: Storage | null): void {
  resolveSessionStorage(storage)?.setItem(PWA_SESSION_ACTIVE_KEY, "1");
}

export function beginPwaBootstrap(storage?: Storage | null): void {
  resolveSessionStorage(storage)?.setItem(PWA_BOOTSTRAP_PENDING_KEY, "1");
}

export function endPwaBootstrap(storage?: Storage | null): void {
  resolveSessionStorage(storage)?.removeItem(PWA_BOOTSTRAP_PENDING_KEY);
  markPwaSessionActive(storage);
}

export function clearPwaBootstrapPending(storage?: Storage | null): void {
  resolveSessionStorage(storage)?.removeItem(PWA_BOOTSTRAP_PENDING_KEY);
}

export function shouldAutoApplySilently(storage?: Storage | null): boolean {
  return isColdStartSession(storage) || isNavigationReload() || isPwaBootstrapPending(storage);
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

/** Cold start, reload o bootstrap pending: applica subito se c'è un SW in attesa. */
export function tryAutoApplyOnColdStart(
  registration: ServiceWorkerRegistration,
  storage?: Storage | null,
): boolean {
  if (!shouldAutoApplySilently(storage)) return false;
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

function waitForInstallingWorker(installing: ServiceWorker): Promise<void> {
  return new Promise((resolve) => {
    if (installing.state !== "installing") {
      resolve();
      return;
    }
    const onStateChange = () => {
      if (installing.state !== "installing") {
        installing.removeEventListener("statechange", onStateChange);
        resolve();
      }
    };
    installing.addEventListener("statechange", onStateChange);
  });
}

/** Attende che registration.update() completi l'installazione iniziale. */
export async function settlePendingServiceWorkerInstall(
  registration: ServiceWorkerRegistration,
  timeoutMs = PWA_UPDATE_SETTLE_TIMEOUT_MS,
): Promise<void> {
  if (registration.waiting) return;

  const installing = registration.installing;
  if (installing) {
    await waitForInstallingWorker(installing);
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const timer = setTimeout(finish, timeoutMs);
    const onUpdateFound = () => {
      clearTimeout(timer);
      registration.removeEventListener("updatefound", onUpdateFound);
      const worker = registration.installing;
      if (worker) {
        void waitForInstallingWorker(worker).then(finish);
        return;
      }
      finish();
    };

    registration.addEventListener("updatefound", onUpdateFound);

    if (registration.installing || registration.waiting) {
      clearTimeout(timer);
      registration.removeEventListener("updatefound", onUpdateFound);
      const worker = registration.installing;
      if (worker) {
        void waitForInstallingWorker(worker).then(finish);
        return;
      }
      finish();
    }
  });
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
  beginPwaBootstrap(storage);
  if (tryAutoApplyOnColdStart(registration, storage)) {
    clearPwaBootstrapPending(storage);
    return null;
  }
  try {
    await registration.update();
  } catch {
    /* best effort */
  }
  await settlePendingServiceWorkerInstall(registration);
  if (tryAutoApplyOnColdStart(registration, storage)) {
    clearPwaBootstrapPending(storage);
    return null;
  }
  endPwaBootstrap(storage);
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
