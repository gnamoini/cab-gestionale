"use client";

import { useEffect } from "react";
import {
  installServiceWorkerControllerChangeReload,
  setPwaServiceWorkerRegistration,
} from "@/lib/pwa/sw-client";
import { registerPwaServiceWorker } from "@/lib/pwa/sw-register";
import {
  bootstrapServiceWorkerUpdateFlow,
  refreshServiceWorkerUpdateCheck,
} from "@/lib/pwa/sw-update";

const PWA_UPDATE_EVENT = "cab-pwa-update-available";

export function dispatchPwaUpdateAvailable(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PWA_UPDATE_EVENT));
}

export function PwaServiceWorkerBridge() {
  useEffect(() => {
    const removeControllerListener = installServiceWorkerControllerChangeReload();
    const subscribedAtMs = performance.now();

    let removeUpdateListener: (() => void) | undefined;
    let registration: ServiceWorkerRegistration | null = null;

    void registerPwaServiceWorker().then(async (nextRegistration) => {
      if (!nextRegistration) return;
      registration = nextRegistration;
      setPwaServiceWorkerRegistration(nextRegistration);
      const unsubscribe = await bootstrapServiceWorkerUpdateFlow(
        nextRegistration,
        dispatchPwaUpdateAvailable,
        subscribedAtMs,
      );
      if (unsubscribe) removeUpdateListener = unsubscribe;
    });

    const onVisible = () => {
      if (document.visibilityState !== "visible" || !registration) return;
      void refreshServiceWorkerUpdateCheck(registration, subscribedAtMs);
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      removeControllerListener();
      removeUpdateListener?.();
      document.removeEventListener("visibilitychange", onVisible);
      setPwaServiceWorkerRegistration(null);
    };
  }, []);

  return null;
}

export { PWA_UPDATE_EVENT };
