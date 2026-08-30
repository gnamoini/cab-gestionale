"use client";

import { useCallback, useEffect, useState } from "react";
import type { NotificationSettingsViewModel } from "@/lib/notifications/preferences/notification-preferences-api";

export function useNotificationPreferences() {
  const [vm, setVm] = useState<NotificationSettingsViewModel>({
    pages: [],
    channelPreferences: { inbox: true, push: true, email: false },
  });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/preferences");
      if (res.ok) {
        setVm((await res.json()) as NotificationSettingsViewModel);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial preferences fetch on mount
    void reload();
  }, [reload]);

  const setEnabled = useCallback(
    async (notificationEventId: string, enabled: boolean) => {
      const res = await fetch(`/api/notifications/preferences/${encodeURIComponent(notificationEventId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) await reload();
      return res.ok;
    },
    [reload],
  );

  const restoreDefault = useCallback(
    async (notificationEventId: string) => {
      const res = await fetch(`/api/notifications/preferences/${encodeURIComponent(notificationEventId)}`, {
        method: "DELETE",
      });
      if (res.ok) await reload();
      return res.ok;
    },
    [reload],
  );

  const restoreAllDefaults = useCallback(async () => {
    const res = await fetch("/api/notifications/preferences/restore-all", { method: "DELETE" });
    if (res.ok) await reload();
    return res.ok;
  }, [reload]);

  return { vm, loading, reload, setEnabled, restoreDefault, restoreAllDefaults };
}
