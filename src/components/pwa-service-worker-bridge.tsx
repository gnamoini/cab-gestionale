"use client";

import { useEffect } from "react";
import {
  installServiceWorkerControllerChangeReload,
  setPwaServiceWorkerRegistration,
} from "@/lib/pwa/sw-client";
import { registerPwaServiceWorker } from "@/lib/pwa/sw-register";
import { subscribeToServiceWorkerUpdates } from "@/lib/pwa/sw-update";

const PWA_UPDATE_EVENT = "cab-pwa-update-available";

export function dispatchPwaUpdateAvailable(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PWA_UPDATE_EVENT));
}

export function PwaServiceWorkerBridge() {
  useEffect(() => {
    const removeControllerListener = installServiceWorkerControllerChangeReload();

    let removeUpdateListener: (() => void) | undefined;

    void registerPwaServiceWorker().then((registration) => {
      if (!registration) return;
      setPwaServiceWorkerRegistration(registration);
      removeUpdateListener = subscribeToServiceWorkerUpdates(registration, dispatchPwaUpdateAvailable);
    });

    return () => {
      removeControllerListener();
      removeUpdateListener?.();
      setPwaServiceWorkerRegistration(null);
    };
  }, []);

  return null;
}

export { PWA_UPDATE_EVENT };
