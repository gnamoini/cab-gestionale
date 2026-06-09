"use client";

import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { denyUnless, assertAllowed } from "@/lib/auth/guard-action";
import {
  canAccessPage,
  canDelete,
  canRead,
  canWrite,
  hasPermission as checkPermission,
  type CanAccessPageOptions,
  type PermissionKey,
  type RbacSection,
} from "@/lib/auth/rbac";
import { hasCapability, type Capability } from "@/lib/rbac";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";

export function useRbac() {
  const { user, status } = useAuth();
  const clientLav = useClientLavorazioniAccess();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const isLoading = status === "loading" || permsLoading;
  const role = snapshot?.role ?? user?.ruolo ?? "guest";
  const rbacCtx = snapshot?.rbacContext ?? { operatorGlobalSettingsDbEnabled: false };
  const rbacUser = snapshot ? snapshot.role : user;

  const pageOpts: CanAccessPageOptions = {
    clientLavorazioniAllowed: clientLav.allowed,
  };

  return {
    user,
    role,
    isLoading,
    operatorGlobalSettingsPilotActive: snapshot?.pilot.effectiveEnabled ?? false,
    clientLavorazioniLoading: false,
    hasPermission: (permission: PermissionKey) => checkPermission(rbacUser, permission, rbacCtx),
    hasCapability: (capability: Capability) => hasCapability(rbacUser, capability, rbacCtx),
    canRead: (section: RbacSection) => canRead(rbacUser, section, rbacCtx),
    canWrite: (section: RbacSection) => canWrite(rbacUser, section, rbacCtx),
    canDelete: (section: RbacSection) => canDelete(rbacUser, section, rbacCtx),
    canAccessPage: (pathname: string, opts?: CanAccessPageOptions) =>
      canAccessPage(rbacUser, pathname, { ...pageOpts, ...opts }, rbacCtx),
    guardWrite: (section: RbacSection, onDenied?: (msg: string) => void) =>
      denyUnless(canWrite(rbacUser, section, rbacCtx), onDenied),
    guardRead: (section: RbacSection, onDenied?: (msg: string) => void) =>
      denyUnless(canRead(rbacUser, section, rbacCtx), onDenied),
    assertWrite: (section: RbacSection) => assertAllowed(canWrite(rbacUser, section, rbacCtx)),
    isAdmin: role === "admin",
    isManager: role === "manager",
    isOperatore: role === "operatore" || role === "manager",
    isGuest: role === "guest",
    /** @deprecated Usare isGuest */
    isOspite: role === "guest",
    isCliente: role === "cliente",
    isReadOnly: role === "guest" || role === "cliente",
    effectivePermissions: snapshot,
  };
}

export type UseRbacReturn = ReturnType<typeof useRbac> & { role: ReturnType<typeof useRbac>["role"] };

/** Sessione pronta per valutazioni RBAC lato client. */
export function useRbacReady(): boolean {
  const { status, user } = useAuth();
  return isAuthSessionEstablished(status) && !!user?.id;
}
