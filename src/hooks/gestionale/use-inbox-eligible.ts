"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { QK } from "@/src/lib/react-query/query-keys";

/** SSOT inbox gate — DB RPC is authoritative; client is consumer only. */
export function useInboxEligible(): {
  eligible: boolean;
  isLoading: boolean;
  isError: boolean;
} {
  const { user, status } = useAuth();
  const userId = user?.id ?? "";
  const authReady = isAuthSessionEstablished(status) && userId.length > 0;

  const query = useQuery({
    queryKey: [...QK.notificationsInboxEligible, userId] as const,
    queryFn: async () => {
      const client = await getBrowserSupabase();
      const { data, error } = await client.rpc("notification_inbox_eligible");
      if (error) throw new Error(error.message);
      return Boolean(data);
    },
    enabled: authReady,
    staleTime: 60_000,
    retry: 2,
  });

  return {
    eligible: query.data === true,
    isLoading: authReady && query.isLoading,
    isError: query.isError,
  };
}

/** Staff-only inbox (settings, desktop controls) — separate RPC, not duplicated client logic. */
export function useStaffInboxEligibleRpc(): {
  eligible: boolean;
  isLoading: boolean;
} {
  const { user, status } = useAuth();
  const userId = user?.id ?? "";
  const authReady = isAuthSessionEstablished(status) && userId.length > 0;

  const query = useQuery({
    queryKey: [...QK.notificationsStaffInboxEligible, userId] as const,
    queryFn: async () => {
      const client = await getBrowserSupabase();
      const { data, error } = await client.rpc("notification_staff_inbox_eligible");
      if (error) throw new Error(error.message);
      return Boolean(data);
    },
    enabled: authReady,
    staleTime: 60_000,
    retry: 2,
  });

  return {
    eligible: query.data === true,
    isLoading: authReady && query.isLoading,
  };
}
