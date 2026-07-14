/** Badge OS — solo da unread count, mai da eventi push. */

export function supportsPwaAppBadge(): boolean {
  return typeof navigator !== "undefined" && "setAppBadge" in navigator;
}

export async function syncPwaAppBadge(unreadCount: number): Promise<void> {
  if (!supportsPwaAppBadge()) return;
  const nav = navigator as Navigator & {
    setAppBadge?: (count: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (unreadCount > 0) {
      await nav.setAppBadge?.(unreadCount);
    } else {
      await nav.clearAppBadge?.();
    }
  } catch {
    /* ignore — badge opzionale */
  }
}
