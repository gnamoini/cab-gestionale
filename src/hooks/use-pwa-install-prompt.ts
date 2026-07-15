"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { isPwaStandaloneMode } from "@/lib/pwa/pwa-display-mode";
import type { PwaInstallPromptOutcome, PwaInstallUiVariant } from "@/lib/pwa/pwa-install";
import { resolvePwaInstallMenuAvailable, resolvePwaInstallUiVariant } from "@/lib/pwa/pwa-install";
import {
  getPwaInstallRuntime,
  subscribePwaInstallRuntime,
  clearPwaDeferredInstallPrompt,
} from "@/lib/pwa/pwa-install-runtime";
import {
  isInstallPromptDismissedInStorage,
  isPwaInstallCompletedInStorage,
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
  const [installMarked, setInstallMarked] = useState(false);

  const platform =
    typeof navigator !== "undefined"
      ? detectPwaPlatform(navigator.userAgent, navigator.maxTouchPoints)
      : ("unknown" as const);

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
    const syncStorage = () => {
      const now = Date.now();
      setDismissed(isInstallPromptDismissedInStorage(now));
      setInstallMarked(isPwaInstallCompletedInStorage() || isStandalone);
    };
    syncStorage();
    window.addEventListener("storage", syncStorage);
    return () => window.removeEventListener("storage", syncStorage);
  }, [isStandalone]);

  const variant: PwaInstallUiVariant = resolvePwaInstallUiVariant({
    platform,
    displayMode,
    hasDeferredPrompt: Boolean(runtime.deferredPrompt),
    dismissed,
    installMarked: installMarked || runtime.installed,
    engagementElapsed,
  });

  const canPrompt = variant === "native" && Boolean(runtime.deferredPrompt);
  const menuInstallAvailable = resolvePwaInstallMenuAvailable({
    platform,
    displayMode,
    hasDeferredPrompt: Boolean(runtime.deferredPrompt),
    installMarked: installMarked || runtime.installed,
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
        setInstallMarked(true);
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
    isStandalone: isStandalone || isPwaStandaloneMode(displayMode),
    platform,
    engagementElapsed,
  };
}
