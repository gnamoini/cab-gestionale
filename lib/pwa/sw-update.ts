import {
  clearPwaUpdateApplyRequested,
  markPwaUpdateApplyRequested,
} from "@/lib/pwa/sw-client";
import { getPwaUpdateBlockReason } from "@/lib/pwa/pwa-update-guard";

export type PwaUpdateState = "idle" | "available" | "applying";

export const PWA_SKIP_WAITING_MESSAGE = { type: "SKIP_WAITING" } as const;

/** sessionStorage: assente = primo bootstrap della tab. */
export const PWA_SESSION_ACTIVE_KEY = "pwa-session-active";

/** Finestra post-load: notifica warm solo dopo bootstrap. */
export const PWA_UPDATE_BOOTSTRAP_MS = 2_000;

/** Attesa installazione SW iniziale post-update(). */
export const PWA_UPDATE_SETTLE_TIMEOUT_MS = 8_000;

function resolveSessionStorage(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage;
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

export function isColdStartSession(storage?: Storage | null): boolean {
  const s = resolveSessionStorage(storage);
  if (!s) return false;
  try {
    return !s.getItem(PWA_SESSION_ACTIVE_KEY);
  } catch {
    return false;
  }
}

export function markPwaSessionActive(storage?: Storage | null): void {
  try {
    resolveSessionStorage(storage)?.setItem(PWA_SESSION_ACTIVE_KEY, "1");
  } catch {
    /* best effort */
  }
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

export function applyServiceWorkerUpdate(registration: ServiceWorkerRegistration): boolean {
  const waiting = getWaitingServiceWorker(registration);
  if (!waiting) return false;
  const blockReason = getPwaUpdateBlockReason();
  if (blockReason) return false;
  markPwaUpdateApplyRequested();
  try {
    waiting.postMessage(PWA_SKIP_WAITING_MESSAGE);
    return true;
  } catch {
    clearPwaUpdateApplyRequested();
    return false;
  }
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
    let onUpdateFound: () => void = () => {};
    const cleanup = () => {
      clearTimeout(timer);
      registration.removeEventListener("updatefound", onUpdateFound);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const timer = setTimeout(finish, timeoutMs);
    onUpdateFound = () => {
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
  options?: { notifyExistingWaiting?: boolean },
): () => void {
  const removeInstallingListeners = new Set<() => void>();

  const onUpdateFound = () => {
    const installing = registration.installing;
    if (!installing) return;
    const onStateChange = () => {
      if (installing.state !== "installed") return;
      removeStateListener();
      if (!navigator.serviceWorker.controller) return;
      onUpdateAvailable();
    };
    const removeStateListener = () => {
      installing.removeEventListener("statechange", onStateChange);
      removeInstallingListeners.delete(removeStateListener);
    };
    removeInstallingListeners.add(removeStateListener);
    installing.addEventListener("statechange", onStateChange);
    onStateChange();
  };

  registration.addEventListener("updatefound", onUpdateFound);
  if (options?.notifyExistingWaiting && registration.waiting && navigator.serviceWorker.controller) {
    onUpdateAvailable();
  }
  return () => {
    registration.removeEventListener("updatefound", onUpdateFound);
    for (const remove of removeInstallingListeners) remove();
    removeInstallingListeners.clear();
  };
}

/** Register + update check without applying or reloading the current document. */
export async function bootstrapServiceWorkerUpdateFlow(
  registration: ServiceWorkerRegistration,
  onUpdateAvailable: () => void,
  _subscribedAtMs: number,
  storage?: Storage | null,
): Promise<(() => void) | null> {
  const coldStart = isColdStartSession(storage);
  try {
    await registration.update();
  } catch {
    /* best effort */
  }
  await settlePendingServiceWorkerInstall(registration);
  markPwaSessionActive(storage);
  return subscribeToServiceWorkerUpdates(registration, onUpdateAvailable, {
    notifyExistingWaiting: !coldStart,
  });
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
