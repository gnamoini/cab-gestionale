"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

export type NotificationPreferenceRow = {
  category: string;
  push_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

export function useNotificationPreferences() {
  const [rows, setRows] = useState<NotificationPreferenceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const client = await getBrowserSupabase();
      const { data } = await client.from("notification_preferences").select("*");
      setRows((data ?? []) as NotificationPreferenceRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upsert = useCallback(
    async (category: string, patch: Partial<NotificationPreferenceRow>) => {
      const client = await getBrowserSupabase();
      const { data: auth } = await client.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return false;
      const { data: profile } = await client.from("profiles").select("company_id").eq("id", userId).maybeSingle();
      const companyId = (profile as { company_id?: string } | null)?.company_id;
      if (!companyId) return false;
      const { error } = await client.from("notification_preferences").upsert({
        user_id: userId,
        category,
        company_id: companyId,
        push_enabled: patch.push_enabled ?? true,
        quiet_hours_start: patch.quiet_hours_start ?? "22:00",
        quiet_hours_end: patch.quiet_hours_end ?? "07:00",
        updated_at: new Date().toISOString(),
      });
      if (!error) await reload();
      return !error;
    },
    [reload],
  );

  return { rows, loading, reload, upsert };
}
