"use client";

import { useEffect } from "react";
import type { BeforeInstallPromptEvent } from "@/lib/pwa/pwa-install";
import { clearStalePwaInstallDetectionState } from "@/lib/pwa/pwa-installed-detection";
import {
  claimPwaInstallBridgeMount,
  handlePwaAppInstalled,
  releasePwaInstallBridgeMount,
  setPwaDeferredInstallPrompt,
} from "@/lib/pwa/pwa-install-runtime";

export function PwaInstallBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!claimPwaInstallBridgeMount()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      clearStalePwaInstallDetectionState();
      setPwaDeferredInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      handlePwaAppInstalled();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      releasePwaInstallBridgeMount();
    };
  }, []);

  return null;
}
