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
const PWA_UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1_000;

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
    let bootstrapComplete = false;
    let updateCheckInFlight = false;
    let updateCheckTimer: number | undefined;
    let cancelled = false;

    const runUpdateCheck = () => {
      if (
        cancelled ||
        !bootstrapComplete ||
        !registration ||
        document.visibilityState !== "visible" ||
        navigator.onLine === false ||
        updateCheckInFlight
      ) {
        return;
      }
      updateCheckInFlight = true;
      void refreshServiceWorkerUpdateCheck(registration, subscribedAtMs).finally(() => {
        updateCheckInFlight = false;
      });
    };

    const onVisible = () => {
      runUpdateCheck();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);

    void registerPwaServiceWorker().then(async (nextRegistration) => {
      if (cancelled || !nextRegistration) return;
      registration = nextRegistration;
      setPwaServiceWorkerRegistration(nextRegistration);
      updateCheckInFlight = true;
      try {
        const unsubscribe = await bootstrapServiceWorkerUpdateFlow(
          nextRegistration,
          dispatchPwaUpdateAvailable,
          subscribedAtMs,
        );
        if (cancelled) {
          unsubscribe?.();
          return;
        }
        removeUpdateListener = unsubscribe ?? undefined;
        bootstrapComplete = true;
        updateCheckTimer = window.setInterval(runUpdateCheck, PWA_UPDATE_CHECK_INTERVAL_MS);
      } finally {
        updateCheckInFlight = false;
      }
    });

    return () => {
      cancelled = true;
      if (updateCheckTimer !== undefined) window.clearInterval(updateCheckTimer);
      removeControllerListener();
      removeUpdateListener?.();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
      setPwaServiceWorkerRegistration(null);
    };
  }, []);

  return null;
}

export { PWA_UPDATE_EVENT };
