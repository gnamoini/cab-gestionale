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
  type Capability,
} from "@/lib/auth/rbac";
import type { RequiredRbacContext } from "@/lib/rbac";
import { hasResolvedCapability } from "@/src/lib/rbac/resolve-user-permissions";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { isRbacSnapshotReady } from "@/src/lib/rbac/rbac-snapshot-access";
import { readStickyRbacSnapshot } from "@/src/lib/rbac/sticky-rbac-snapshot";

export function useRbac() {
  const { user, status } = useAuth();
  const clientLav = useClientLavorazioniAccess();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const sticky = readStickyRbacSnapshot();
  const effectiveSnap =
    snapshot && isRbacSnapshotReady(snapshot)
      ? snapshot
      : sticky && isRbacSnapshotReady(sticky)
        ? sticky
        : null;

  const isLoading = status === "loading" || (permsLoading && !effectiveSnap);
  const role = effectiveSnap?.role ?? user?.ruolo ?? "guest";
  const rbacCtx = effectiveSnap?.rbacContext as RequiredRbacContext | undefined;
  const rbacUser = effectiveSnap ? effectiveSnap.role : user;
  const operatorGlobalSettingsPilotActive = effectiveSnap?.pilot.effectiveEnabled ?? false;
  const clientLavorazioniAllowed = clientLav.allowed;

  const hasPermission = useCallback(
    (permission: PermissionKey) => {
      if (!rbacCtx || !rbacUser) return false;
      return checkPermission(rbacUser, permission, rbacCtx);
    },
    [rbacUser, rbacCtx],
  );
  const hasCapabilityFn = useCallback(
    (capability: Capability) =>
      effectiveSnap?.resolved ? hasResolvedCapability(effectiveSnap.resolved, capability) : false,
    [effectiveSnap?.resolved],
  );
  const canReadFn = useCallback(
    (section: RbacSection) => {
      if (!rbacCtx || !rbacUser) return false;
      return canRead(rbacUser, section, rbacCtx);
    },
    [rbacUser, rbacCtx],
  );
  const canWriteFn = useCallback(
    (section: RbacSection) => {
      if (!rbacCtx || !rbacUser) return false;
      return canWrite(rbacUser, section, rbacCtx);
    },
    [rbacUser, rbacCtx],
  );
  const canDeleteFn = useCallback(
    (section: RbacSection) => {
      if (!rbacCtx || !rbacUser) return false;
      return canDelete(rbacUser, section, rbacCtx);
    },
    [rbacUser, rbacCtx],
  );
  const canAccessPageFn = useCallback(
    (pathname: string, opts?: CanAccessPageOptions) => {
      if (!rbacCtx || !rbacUser) return false;
      return canAccessPage(rbacUser, pathname, { clientLavorazioniAllowed, ...opts }, rbacCtx);
    },
    [rbacUser, rbacCtx, clientLavorazioniAllowed],
  );
  const guardWrite = useCallback(
    (section: RbacSection, onDenied?: (msg: string) => void) => {
      if (!rbacCtx || !rbacUser) return denyUnless(false, onDenied);
      return denyUnless(canWrite(rbacUser, section, rbacCtx), onDenied);
    },
    [rbacUser, rbacCtx],
  );
  const guardRead = useCallback(
    (section: RbacSection, onDenied?: (msg: string) => void) => {
      if (!rbacCtx || !rbacUser) return denyUnless(false, onDenied);
      return denyUnless(canRead(rbacUser, section, rbacCtx), onDenied);
    },
    [rbacUser, rbacCtx],
  );
  const assertWrite = useCallback(
    (section: RbacSection) => {
      if (!rbacCtx || !rbacUser) assertAllowed(false);
      else assertAllowed(canWrite(rbacUser, section, rbacCtx));
    },
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
      effectivePermissions: effectiveSnap,
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
      effectiveSnap,
    ],
  );
}

export type UseRbacReturn = ReturnType<typeof useRbac> & { role: ReturnType<typeof useRbac>["role"] };

/** Sessione pronta per valutazioni RBAC lato client. */
export function useRbacReady(): boolean {
  const { status, user } = useAuth();
  return isAuthSessionEstablished(status) && !!user?.id;
}
