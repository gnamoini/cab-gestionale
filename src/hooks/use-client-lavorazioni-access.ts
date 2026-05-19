"use client";

import { useQuery } from "@tanstack/react-query";
import { getMyClientLavorazioniAccessAction } from "@/src/actions/client-lavorazioni-access";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { resolveRole, hasPermission, isClienteRole, CLIENTE_HOME_PATH } from "@/lib/auth/rbac";
import { QK } from "@/src/lib/react-query/invalidate-related";

export function useClientLavorazioniAccess() {
  const { user, status } = useAuth();
  const role = resolveRole(user?.ruolo);
  const adminDefault = hasPermission(role, "viewClientLavorazioni");
  const clienteDefault = isClienteRole(role);

  const q = useQuery({
    queryKey: [...QK.clientLavorazioniAccess, user?.id ?? "anon"] as const,
    queryFn: async () => {
      const res = await getMyClientLavorazioniAccessAction();
      if (!res.ok) throw new Error(res.message);
      return res.allowed;
    },
    enabled: isAuthSessionEstablished(status) && !!user?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const allowed = adminDefault || clienteDefault || q.data === true;

  return {
    allowed,
    isLoading: status === "loading" || q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: q.refetch,
  };
}
