export const PWA_UPDATE_APPLIED_KEY = "pwa-update-applied";
export const PWA_UPDATE_APPLIED_TTL_MS = 30_000;
export const PWA_UPDATE_APPLY_REQUESTED_KEY = "pwa-update-apply-requested";
export const PWA_UPDATE_APPLY_REQUESTED_TTL_MS = 30_000;

let registrationRef: ServiceWorkerRegistration | null = null;

export function setPwaServiceWorkerRegistration(registration: ServiceWorkerRegistration | null): void {
  registrationRef = registration;
}

export function getPwaServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  return registrationRef;
}

function readSessionStorage(key: string): number {
  if (typeof sessionStorage === "undefined") return 0;
  try {
    return Number(sessionStorage.getItem(key) ?? 0);
  } catch {
    return 0;
  }
}

function writeSessionStorage(key: string, value: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* best effort */
  }
}

function removeSessionStorage(key: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* best effort */
  }
}

/** Marks only an explicit user action as eligible for a controllerchange reload. */
export function markPwaUpdateApplyRequested(): void {
  writeSessionStorage(PWA_UPDATE_APPLY_REQUESTED_KEY, String(Date.now()));
}

export function clearPwaUpdateApplyRequested(): void {
  removeSessionStorage(PWA_UPDATE_APPLY_REQUESTED_KEY);
}

function consumePwaUpdateApplyRequested(): boolean {
  const requestedAt = readSessionStorage(PWA_UPDATE_APPLY_REQUESTED_KEY);
  removeSessionStorage(PWA_UPDATE_APPLY_REQUESTED_KEY);
  return requestedAt > 0 && Date.now() - requestedAt < PWA_UPDATE_APPLY_REQUESTED_TTL_MS;
}

/** Reload singolo dopo update esplicito — evita loop controllerchange. */
export function reloadAfterServiceWorkerUpdate(): boolean {
  if (typeof window === "undefined") return false;
  if (!consumePwaUpdateApplyRequested()) return false;

  const last = readSessionStorage(PWA_UPDATE_APPLIED_KEY);
  if (Date.now() - last < PWA_UPDATE_APPLIED_TTL_MS) return false;
  writeSessionStorage(PWA_UPDATE_APPLIED_KEY, String(Date.now()));
  window.location.reload();
  return true;
}

export function installServiceWorkerControllerChangeReload(): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return () => {};

  const onControllerChange = () => {
    reloadAfterServiceWorkerUpdate();
  };

  navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
  return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
}
