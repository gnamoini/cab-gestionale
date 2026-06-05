"use client";

import { useQuery } from "@tanstack/react-query";
import { getMyClientLavorazioniAccessAction } from "@/src/actions/client-lavorazioni-access";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { resolveRole, hasPermission } from "@/lib/auth/rbac";
import { QK } from "@/src/lib/react-query/invalidate-related";

export function useClientLavorazioniAccess() {
  const { user, status } = useAuth();
  const role = resolveRole(user?.ruolo);
  const roleGrantsPortal = hasPermission(role, "viewClientLavorazioni");

  const q = useQuery({
    queryKey: [...QK.clientLavorazioniAccess, user?.id ?? "anon"] as const,
    queryFn: async () => {
      const res = await getMyClientLavorazioniAccessAction();
      if (!res.ok) throw new Error(res.message);
      return res.allowed;
    },
    enabled: isAuthSessionEstablished(status) && !!user?.id && roleGrantsPortal,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const allowed = roleGrantsPortal && (q.data !== false);

  return {
    allowed: roleGrantsPortal ? (q.isLoading ? true : (q.data ?? true)) : false,
    isLoading: roleGrantsPortal && (status === "loading" || q.isLoading),
    isError: q.isError,
    error: q.error,
    refetch: q.refetch,
  };
}
