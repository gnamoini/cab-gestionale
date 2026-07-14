export type PwaUpdateState = "idle" | "available" | "applying";

export const PWA_SKIP_WAITING_MESSAGE = { type: "SKIP_WAITING" } as const;

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
): () => void {
  if (registration.waiting) {
    onUpdateAvailable();
  }

  const onUpdateFound = () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener("statechange", () => {
      if (installing.state === "installed" && navigator.serviceWorker.controller) {
        onUpdateAvailable();
      }
    });
  };

  registration.addEventListener("updatefound", onUpdateFound);
  return () => registration.removeEventListener("updatefound", onUpdateFound);
}
