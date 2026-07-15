"use client";

import { useCallback, useMemo } from "react";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { denyUnless, assertAllowed } from "@/lib/auth/guard-action";
import { canAccessPage as checkCanAccessPage } from "@/lib/auth/rbac";
import type { RequiredRbacContext } from "@/lib/auth/rbac";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
import { canReadPage, canWritePage } from "@/src/lib/rbac/resolve-page-access";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { isRbacSnapshotReady } from "@/src/lib/rbac/rbac-snapshot-access";

export function useRbac() {
  const { user, status } = useAuth();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const effectiveSnap = snapshot && isRbacSnapshotReady(snapshot) ? snapshot : null;

  const isLoading = status === "loading" || permsLoading;
  const role = effectiveSnap?.role ?? user?.ruolo ?? "guest";
  const rbacCtx = effectiveSnap?.rbacContext as RequiredRbacContext | undefined;
  const resolved = effectiveSnap?.resolved;
  const operatorGlobalSettingsPilotActive = effectiveSnap?.pilot.effectiveEnabled ?? false;

  const canReadPageFn = useCallback(
    (pageKey: GestionalePageKey) => {
      if (!resolved) return false;
      return canReadPage(resolved, pageKey);
    },
    [resolved],
  );
  const canWritePageFn = useCallback(
    (pageKey: GestionalePageKey) => {
      if (!resolved) return false;
      return canWritePage(resolved, pageKey);
    },
    [resolved],
  );
  const canAccessPageFn = useCallback(
    (pathname: string) => {
      if (!rbacCtx) return false;
      return checkCanAccessPage(pathname, rbacCtx);
    },
    [rbacCtx],
  );
  const guardWritePage = useCallback(
    (pageKey: GestionalePageKey, onDenied?: (msg: string) => void) => {
      if (!resolved) return denyUnless(false, onDenied);
      return denyUnless(canWritePage(resolved, pageKey), onDenied);
    },
    [resolved],
  );
  const guardReadPage = useCallback(
    (pageKey: GestionalePageKey, onDenied?: (msg: string) => void) => {
      if (!resolved) return denyUnless(false, onDenied);
      return denyUnless(canReadPage(resolved, pageKey), onDenied);
    },
    [resolved],
  );
  const assertWritePage = useCallback(
    (pageKey: GestionalePageKey) => {
      if (!resolved) assertAllowed(false);
      else assertAllowed(canWritePage(resolved, pageKey));
    },
    [resolved],
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
      canReadPage: canReadPageFn,
      canWritePage: canWritePageFn,
      canAccessPage: canAccessPageFn,
      guardWritePage,
      guardReadPage,
      assertWritePage,
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
      canReadPageFn,
      canWritePageFn,
      canAccessPageFn,
      guardWritePage,
      guardReadPage,
      assertWritePage,
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

export type UseRbacReturn = ReturnType<typeof useRbac>;

export function useRbacReady(): boolean {
  const { status, user } = useAuth();
  return isAuthSessionEstablished(status) && !!user?.id;
}
