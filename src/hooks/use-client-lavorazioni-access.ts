"use client";

import { useCallback } from "react";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { resolveRole, hasPermission } from "@/lib/auth/rbac";

/** Accesso portale clienti: role-only (admin/cliente), sincrono come le altre voci nav. */
export function useClientLavorazioniAccess() {
  const { user, status } = useAuth();
  const sessionReady = isAuthSessionEstablished(status);
  const role = resolveRole(user?.ruolo);
  const roleGrantsPortal = hasPermission(role, "viewClientLavorazioni");
  const allowed = sessionReady && !!user?.id && roleGrantsPortal;

  const refetch = useCallback(async () => undefined, []);

  return {
    allowed,
    isLoading: !sessionReady,
    isError: false,
    error: null as Error | null,
    refetch,
  };
}
