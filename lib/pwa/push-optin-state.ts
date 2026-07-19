export const PWA_PUSH_OPTIN_STATE_NS = "cab-pwa-push-optin-state-v1" as const;
export const PWA_PUSH_OPTIN_DISMISS_KEY = `${PWA_PUSH_OPTIN_STATE_NS}:dismissed-until` as const;

export const PWA_PUSH_OPTIN_DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const PWA_PUSH_OPTIN_MIN_ENGAGEMENT_MS = 0;

export function isPushOptInDismissed(now: number, raw: string | null): boolean {
  if (!raw?.trim()) return false;
  const until = Number(raw);
  if (!Number.isFinite(until) || until <= now) return false;
  return true;
}

export function writePushOptInDismiss(now: number, ttlMs = PWA_PUSH_OPTIN_DISMISS_TTL_MS): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PWA_PUSH_OPTIN_DISMISS_KEY, String(now + ttlMs));
  } catch {
    /* ignore */
  }
}

export function isPushOptInDismissedInStorage(now: number): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return isPushOptInDismissed(now, localStorage.getItem(PWA_PUSH_OPTIN_DISMISS_KEY));
  } catch {
    return false;
  }
}
