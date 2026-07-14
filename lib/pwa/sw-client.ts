export const PWA_UPDATE_APPLIED_KEY = "pwa-update-applied";
export const PWA_UPDATE_APPLIED_TTL_MS = 30_000;

let registrationRef: ServiceWorkerRegistration | null = null;

export function setPwaServiceWorkerRegistration(registration: ServiceWorkerRegistration | null): void {
  registrationRef = registration;
}

export function getPwaServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  return registrationRef;
}

/** Reload singolo dopo update — evita loop controllerchange. */
export function reloadAfterServiceWorkerUpdate(): void {
  if (typeof window === "undefined") return;
  const last = Number(sessionStorage.getItem(PWA_UPDATE_APPLIED_KEY) ?? 0);
  if (Date.now() - last < PWA_UPDATE_APPLIED_TTL_MS) return;
  sessionStorage.setItem(PWA_UPDATE_APPLIED_KEY, String(Date.now()));
  window.location.reload();
}

export function installServiceWorkerControllerChangeReload(): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return () => {};

  const onControllerChange = () => {
    reloadAfterServiceWorkerUpdate();
  };

  navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
  return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
}
