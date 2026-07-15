export type PwaUpdateState = "idle" | "available" | "applying";

export const PWA_SKIP_WAITING_MESSAGE = { type: "SKIP_WAITING" } as const;

/** Finestra post-load: update trovati qui sono già coperti dal reload/navigation corrente. */
export const PWA_UPDATE_BOOTSTRAP_MS = 2_000;

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

export function subscribeToServiceWorkerUpdates(
  registration: ServiceWorkerRegistration,
  onUpdateAvailable: () => void,
  options?: { subscribedAtMs?: number },
): () => void {
  const subscribedAtMs = options?.subscribedAtMs ?? performance.now();

  const notifyIfRuntimeUpdate = () => {
    if (!shouldNotifyServiceWorkerUpdateAfterBootstrap(subscribedAtMs)) return;
    onUpdateAvailable();
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
