"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  isPwaAppInstalledOnDeviceSync,
  queryPwaRelatedAppInstalledOnDevice,
} from "@/lib/pwa/pwa-installed-detection";
import type { PwaInstallPromptOutcome, PwaInstallUiVariant } from "@/lib/pwa/pwa-install";
import { resolvePwaInstallMenuAvailable, resolvePwaInstallUiVariant } from "@/lib/pwa/pwa-install";
import {
  getPwaInstallRuntime,
  subscribePwaInstallRuntime,
  clearPwaDeferredInstallPrompt,
} from "@/lib/pwa/pwa-install-runtime";
import {
  isInstallPromptDismissedInStorage,
  markPwaInstallCompleted,
  PWA_INSTALL_MIN_ENGAGEMENT_MS,
  writeInstallDismiss,
} from "@/lib/pwa/pwa-install-state";
import { detectPwaPlatform } from "@/lib/pwa/pwa-platform";
import { usePwaDisplayMode } from "@/src/hooks/use-pwa-display-mode";

function readRuntimeSnapshot() {
  return getPwaInstallRuntime();
}

export function usePwaInstallPrompt() {
  const runtime = useSyncExternalStore(subscribePwaInstallRuntime, readRuntimeSnapshot, () =>
    getPwaInstallRuntime(),
  );
  const { displayMode, isStandalone } = usePwaDisplayMode();
  const [engagementElapsed, setEngagementElapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [relatedAppInstalled, setRelatedAppInstalled] = useState(false);

  const platform =
    typeof navigator !== "undefined"
      ? detectPwaPlatform(navigator.userAgent, navigator.maxTouchPoints)
      : ("unknown" as const);

  const refreshInstalledOnDevice = useCallback(async () => {
    if (isPwaAppInstalledOnDeviceSync(displayMode)) {
      setRelatedAppInstalled(false);
      return;
    }
    setRelatedAppInstalled(await queryPwaRelatedAppInstalledOnDevice());
  }, [displayMode]);

  useEffect(() => {
    const schedule = (cb: () => void) => {
      if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(cb, { timeout: PWA_INSTALL_MIN_ENGAGEMENT_MS + 500 });
        return () => window.cancelIdleCallback(id);
      }
      const id = window.setTimeout(cb, PWA_INSTALL_MIN_ENGAGEMENT_MS);
      return () => window.clearTimeout(id);
    };
    return schedule(() => setEngagementElapsed(true));
  }, []);

  useEffect(() => {
    const syncDismiss = () => {
      setDismissed(isInstallPromptDismissedInStorage(Date.now()));
    };
    syncDismiss();
    window.addEventListener("storage", syncDismiss);
    return () => window.removeEventListener("storage", syncDismiss);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- probe related-app install on mount
    void refreshInstalledOnDevice();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshInstalledOnDevice();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshInstalledOnDevice]);

  useEffect(() => {
    if (isPwaAppInstalledOnDeviceSync(displayMode)) return;
    if (!runtime.deferredPrompt) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setRelatedAppInstalled(false);
  }, [displayMode, runtime.deferredPrompt]);

  const isAppInstalled = isStandalone || relatedAppInstalled;

  const variant: PwaInstallUiVariant = resolvePwaInstallUiVariant({
    platform,
    displayMode,
    hasDeferredPrompt: Boolean(runtime.deferredPrompt),
    dismissed,
    installMarked: isAppInstalled,
    engagementElapsed,
  });

  const canPrompt = variant === "native" && Boolean(runtime.deferredPrompt);
  const menuInstallAvailable = resolvePwaInstallMenuAvailable({
    platform,
    displayMode,
    hasDeferredPrompt: Boolean(runtime.deferredPrompt),
    installMarked: isAppInstalled,
  });

  const promptInstall = useCallback(async (): Promise<PwaInstallPromptOutcome> => {
    const prompt = getPwaInstallRuntime().deferredPrompt;
    if (!prompt) return "unavailable";
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      clearPwaDeferredInstallPrompt();
      if (outcome === "accepted") {
        markPwaInstallCompleted();
        setRelatedAppInstalled(true);
        return "accepted";
      }
      const until = writeInstallDismiss(Date.now());
      setDismissed(until > Date.now());
      return "dismissed";
    } catch {
      clearPwaDeferredInstallPrompt();
      return "unavailable";
    }
  }, []);

  const dismissInstall = useCallback(() => {
    writeInstallDismiss(Date.now());
    setDismissed(true);
  }, []);

  return {
    variant,
    canPrompt,
    menuInstallAvailable,
    promptInstall,
    dismissInstall,
    isStandalone,
    isAppInstalled,
    platform,
    engagementElapsed,
  };
}
