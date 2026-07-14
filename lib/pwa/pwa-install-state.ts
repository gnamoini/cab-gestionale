export const PWA_INSTALL_STATE_NS = "cab-pwa-install-state-v1" as const;

export const PWA_INSTALL_DISMISS_KEY = `${PWA_INSTALL_STATE_NS}:dismissed-until` as const;
export const PWA_INSTALL_COMPLETED_KEY = `${PWA_INSTALL_STATE_NS}:completed` as const;

export const PWA_INSTALL_DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const PWA_INSTALL_MIN_ENGAGEMENT_MS = 5_000;

export function readInstallDismissedUntil(now: number, raw: string | null): number | null {
  if (!raw?.trim()) return null;
  const until = Number(raw);
  if (!Number.isFinite(until) || until <= 0) return null;
  if (until <= now) return null;
  return until;
}

export function isInstallPromptDismissed(now: number, raw: string | null): boolean {
  return readInstallDismissedUntil(now, raw) !== null;
}

export function computeInstallDismissUntil(now: number, ttlMs = PWA_INSTALL_DISMISS_TTL_MS): number {
  return now + ttlMs;
}

export function isPwaInstallMarkedCompleted(raw: string | null): boolean {
  return raw === "1";
}

/** I/O localStorage — separato per testabilità pura delle funzioni sopra. */

export function readInstallDismissedUntilFromStorage(now: number): number | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return readInstallDismissedUntil(now, localStorage.getItem(PWA_INSTALL_DISMISS_KEY));
  } catch {
    return null;
  }
}

export function isInstallPromptDismissedInStorage(now: number): boolean {
  return readInstallDismissedUntilFromStorage(now) !== null;
}

export function writeInstallDismiss(now: number, ttlMs = PWA_INSTALL_DISMISS_TTL_MS): number {
  const until = computeInstallDismissUntil(now, ttlMs);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(PWA_INSTALL_DISMISS_KEY, String(until));
    } catch {
      /* quota / private mode */
    }
  }
  return until;
}

export function clearInstallDismiss(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(PWA_INSTALL_DISMISS_KEY);
  } catch {
    /* ignore */
  }
}

export function markPwaInstallCompleted(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PWA_INSTALL_COMPLETED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isPwaInstallCompletedInStorage(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return isPwaInstallMarkedCompleted(localStorage.getItem(PWA_INSTALL_COMPLETED_KEY));
  } catch {
    return false;
  }
}
