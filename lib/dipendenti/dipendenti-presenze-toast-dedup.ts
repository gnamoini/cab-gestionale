const PRESENZE_TOAST_STORAGE_PREFIX = "dip-pres-toast";

export function dipendentiPresenzeToastStorageKey(userId: string, dateYmd: string): string {
  return `${PRESENZE_TOAST_STORAGE_PREFIX}:${userId.trim()}:${dateYmd}`;
}

export function hasDipendentiPresenzeToastBeenShown(userId: string, dateYmd: string): boolean {
  if (typeof window === "undefined" || !userId.trim()) return false;
  try {
    return window.localStorage.getItem(dipendentiPresenzeToastStorageKey(userId, dateYmd)) === "1";
  } catch {
    return false;
  }
}

export function markDipendentiPresenzeToastShown(userId: string, dateYmd: string): void {
  if (typeof window === "undefined" || !userId.trim()) return;
  try {
    window.localStorage.setItem(dipendentiPresenzeToastStorageKey(userId, dateYmd), "1");
  } catch {
    /* ponytail: storage best-effort */
  }
}
