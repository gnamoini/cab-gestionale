import { PWA_SW_PATH, PWA_SW_SCOPE } from "@/lib/pwa/sw-prelude";

export function shouldRegisterPwaServiceWorker(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function registerPwaServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!shouldRegisterPwaServiceWorker()) return null;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  if (!location.pathname.startsWith(PWA_SW_SCOPE)) return null;

  try {
    return await navigator.serviceWorker.register(PWA_SW_PATH, { scope: PWA_SW_SCOPE });
  } catch {
    return null;
  }
}
