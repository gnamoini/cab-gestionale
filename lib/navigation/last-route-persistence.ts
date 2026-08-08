import { sanitizePostLoginRequestedPath } from "@/lib/auth/resolve-post-login-redirect";

const STORAGE_KEY_PREFIX = "gestionale.navigation.lastRoute.v1";
const OFFLINE_PATH = "/offline";

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}.${userId}`;
}

/** Route interna gestionale persistibile (pathname + query opzionale). */
export function isPersistableGestionaleRoute(route: string): boolean {
  const sanitized = sanitizePostLoginRequestedPath(route);
  if (!sanitized) return false;
  const pathOnly = sanitized.split("?")[0] ?? sanitized;
  if (pathOnly === "/" || pathOnly === OFFLINE_PATH || pathOnly.startsWith(`${OFFLINE_PATH}/`)) {
    return false;
  }
  return true;
}

export function buildGestionaleRoute(pathname: string, search: string): string {
  if (!search || search === "?") return pathname;
  return search.startsWith("?") ? `${pathname}${search}` : `${pathname}?${search}`;
}

export function saveLastGestionaleRoute(userId: string, route: string): void {
  if (!userId || typeof window === "undefined") return;
  if (!isPersistableGestionaleRoute(route)) return;
  const sanitized = sanitizePostLoginRequestedPath(route);
  if (!sanitized) return;
  try {
    window.localStorage.setItem(storageKey(userId), sanitized);
  } catch {
    /* quota / private mode */
  }
}

export function loadLastGestionaleRoute(userId: string): string | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const sanitized = sanitizePostLoginRequestedPath(raw);
    if (!sanitized || !isPersistableGestionaleRoute(sanitized)) return null;
    return sanitized;
  } catch {
    return null;
  }
}

export const LAST_ROUTE_RESTORE_ATTEMPTED_KEY = "gestionale.navigation.restoreAttempted";

export function hasLastRouteRestoreBeenAttempted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(LAST_ROUTE_RESTORE_ATTEMPTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markLastRouteRestoreAttempted(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LAST_ROUTE_RESTORE_ATTEMPTED_KEY, "1");
  } catch {
    /* private mode */
  }
}
