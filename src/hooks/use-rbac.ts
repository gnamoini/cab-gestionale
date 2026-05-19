"use client";

import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { denyUnless, assertAllowed } from "@/lib/auth/guard-action";
import {
  canAccessPage,
  canDelete,
  canRead,
  canWrite,
  hasPermission,
  resolveRole,
  type AppRole,
  type CanAccessPageOptions,
  type PermissionKey,
  type RbacSection,
} from "@/lib/auth/rbac";
import { hasCapability, type Capability } from "@/lib/rbac";

export function useRbac() {
  const { user, status } = useAuth();
  const clientLav = useClientLavorazioniAccess();
  const isLoading = status === "loading";
  const role = resolveRole(user);

  const pageOpts: CanAccessPageOptions = {
    clientLavorazioniAllowed: clientLav.allowed,
  };

  return {
    user,
    role,
    isLoading,
    clientLavorazioniLoading: clientLav.isLoading,
    hasPermission: (permission: PermissionKey) => hasPermission(user, permission),
    hasCapability: (capability: Capability) => hasCapability(user, capability),
    canRead: (section: RbacSection) => canRead(user, section),
    canWrite: (section: RbacSection) => canWrite(user, section),
    canDelete: (section: RbacSection) => canDelete(user, section),
    canAccessPage: (pathname: string, opts?: CanAccessPageOptions) =>
      canAccessPage(user, pathname, { ...pageOpts, ...opts }),
    /** Handler guard: ritorna false e opzionalmente setta errore se non autorizzato. */
    guardWrite: (section: RbacSection, onDenied?: (msg: string) => void) =>
      denyUnless(canWrite(user, section), onDenied),
    guardRead: (section: RbacSection, onDenied?: (msg: string) => void) =>
      denyUnless(canRead(user, section), onDenied),
    assertWrite: (section: RbacSection) => assertAllowed(canWrite(user, section)),
    isAdmin: role === "admin",
    isManager: role === "manager",
    isOperatore: role === "operatore" || role === "manager",
    isGuest: role === "guest",
    /** @deprecated Usare isGuest */
    isOspite: role === "guest",
    isCliente: role === "cliente",
    isReadOnly: role === "guest" || role === "cliente",
  };
}

export type UseRbacReturn = ReturnType<typeof useRbac> & { role: AppRole };

/** Sessione pronta per valutazioni RBAC lato client. */
export function useRbacReady(): boolean {
  const { status, user } = useAuth();
  return isAuthSessionEstablished(status) && !!user?.id;
}
