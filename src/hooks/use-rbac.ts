"use client";

import { useCallback, useMemo } from "react";
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
  const operatorGlobalSettingsPilotActive = snapshot?.pilot.effectiveEnabled ?? false;
  const clientLavorazioniAllowed = clientLav.allowed;

  const hasPermission = useCallback(
    (permission: PermissionKey) => checkPermission(rbacUser, permission, rbacCtx),
    [rbacUser, rbacCtx],
  );
  const hasCapabilityFn = useCallback(
    (capability: Capability) => hasCapability(rbacUser, capability, rbacCtx),
    [rbacUser, rbacCtx],
  );
  const canReadFn = useCallback(
    (section: RbacSection) => canRead(rbacUser, section, rbacCtx),
    [rbacUser, rbacCtx],
  );
  const canWriteFn = useCallback(
    (section: RbacSection) => canWrite(rbacUser, section, rbacCtx),
    [rbacUser, rbacCtx],
  );
  const canDeleteFn = useCallback(
    (section: RbacSection) => canDelete(rbacUser, section, rbacCtx),
    [rbacUser, rbacCtx],
  );
  const canAccessPageFn = useCallback(
    (pathname: string, opts?: CanAccessPageOptions) =>
      canAccessPage(rbacUser, pathname, { clientLavorazioniAllowed, ...opts }, rbacCtx),
    [rbacUser, rbacCtx, clientLavorazioniAllowed],
  );
  const guardWrite = useCallback(
    (section: RbacSection, onDenied?: (msg: string) => void) =>
      denyUnless(canWrite(rbacUser, section, rbacCtx), onDenied),
    [rbacUser, rbacCtx],
  );
  const guardRead = useCallback(
    (section: RbacSection, onDenied?: (msg: string) => void) =>
      denyUnless(canRead(rbacUser, section, rbacCtx), onDenied),
    [rbacUser, rbacCtx],
  );
  const assertWrite = useCallback(
    (section: RbacSection) => assertAllowed(canWrite(rbacUser, section, rbacCtx)),
    [rbacUser, rbacCtx],
  );

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isOperatore = role === "operatore" || role === "manager";
  const isGuest = role === "guest";
  const isCliente = role === "cliente";
  const isReadOnly = role === "guest" || role === "cliente";

  return useMemo(
    () => ({
      user,
      role,
      isLoading,
      operatorGlobalSettingsPilotActive,
      clientLavorazioniLoading: false,
      hasPermission,
      hasCapability: hasCapabilityFn,
      canRead: canReadFn,
      canWrite: canWriteFn,
      canDelete: canDeleteFn,
      canAccessPage: canAccessPageFn,
      guardWrite,
      guardRead,
      assertWrite,
      isAdmin,
      isManager,
      isOperatore,
      isGuest,
      isOspite: isGuest,
      isCliente,
      isReadOnly,
      effectivePermissions: snapshot,
    }),
    [
      user,
      role,
      isLoading,
      operatorGlobalSettingsPilotActive,
      hasPermission,
      hasCapabilityFn,
      canReadFn,
      canWriteFn,
      canDeleteFn,
      canAccessPageFn,
      guardWrite,
      guardRead,
      assertWrite,
      isAdmin,
      isManager,
      isOperatore,
      isGuest,
      isCliente,
      isReadOnly,
      snapshot,
    ],
  );
}

export type UseRbacReturn = ReturnType<typeof useRbac> & { role: ReturnType<typeof useRbac>["role"] };

/** Sessione pronta per valutazioni RBAC lato client. */
export function useRbacReady(): boolean {
  const { status, user } = useAuth();
  return isAuthSessionEstablished(status) && !!user?.id;
}
