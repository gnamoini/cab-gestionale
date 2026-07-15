import { isPwaStandaloneMode, resolvePwaDisplayMode, type PwaDisplayMode } from "@/lib/pwa/pwa-display-mode";
import { clearPwaInstallCompleted } from "@/lib/pwa/pwa-install-state";
import { clearPwaInstallRuntimeInstalled } from "@/lib/pwa/pwa-install-runtime";

type NavigatorWithInstallSignals = Navigator & {
  standalone?: boolean;
  getInstalledRelatedApps?: () => Promise<ReadonlyArray<{ platform?: string; url?: string }>>;
};

/** App aperta come PWA (standalone / fullscreen / minimal-ui). */
export function isPwaAppInstalledOnDeviceSync(displayMode: PwaDisplayMode): boolean {
  return isPwaStandaloneMode(displayMode);
}

export function readPwaDisplayModeInBrowser(): PwaDisplayMode {
  if (typeof window === "undefined") return "browser";
  const nav = window.navigator as NavigatorWithInstallSignals;
  return resolvePwaDisplayMode({
    matchMedia: (q) => window.matchMedia(q),
    navigatorStandalone: nav.standalone === true,
  });
}

/** Chromium: PWA ancora presente sul dispositivo anche se la tab browser è aperta. */
export async function queryPwaRelatedAppInstalledOnDevice(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const getInstalled = (navigator as NavigatorWithInstallSignals).getInstalledRelatedApps;
  if (typeof getInstalled !== "function") return false;
  try {
    const apps = await getInstalled();
    return Array.isArray(apps) && apps.length > 0;
  } catch {
    return false;
  }
}

export async function resolvePwaAppInstalledOnDevice(
  displayMode: PwaDisplayMode = readPwaDisplayModeInBrowser(),
): Promise<boolean> {
  if (isPwaAppInstalledOnDeviceSync(displayMode)) return true;
  return queryPwaRelatedAppInstalledOnDevice();
}

/** beforeinstallprompt = install non attivo → pulisce flag stale post-disinstallazione. */
export function clearStalePwaInstallDetectionState(): void {
  clearPwaInstallCompleted();
  clearPwaInstallRuntimeInstalled();
}
