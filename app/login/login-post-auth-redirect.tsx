"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useAuth, isAuthFullyAuthenticated } from "@/context/auth-context";
import { resolveFirstAccessiblePageHrefFromResolved } from "@/lib/auth/rbac";
import { resolvePostLoginRedirectPath } from "@/lib/auth/resolve-post-login-redirect";
import { createRbacNavAccess, isRbacSnapshotReady } from "@/src/lib/rbac/rbac-snapshot-access";
import { useEffectivePermissionsSource } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { isStagingBlockedPathname, isStagingPublicSlice } from "@/lib/env/staging-public";
import { deferredRouterReplace, deferredRouterRefresh } from "@/lib/navigation/deferred-app-router";

type LoginPostAuthRedirectProps = {
  onRedirecting: () => void;
};

/** RBAC post-login redirect — montato solo con sessione autenticata. */
export function LoginPostAuthRedirect({ onRedirecting }: LoginPostAuthRedirectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, user } = useAuth();
  const { snapshot: permissionsSnapshot, isLoading: permissionsLoading } = useEffectivePermissionsSource();

  useEffect(() => {
    if (!isAuthFullyAuthenticated(status)) return;
    if (!user?.id) return;
    if (permissionsLoading || !permissionsSnapshot || !isRbacSnapshotReady(permissionsSnapshot)) return;

    const navAccess = createRbacNavAccess(permissionsSnapshot);

    const target = resolvePostLoginRedirectPath({
      user: { ruolo: user.ruolo, id: user.id },
      navAccess,
      snapshot: permissionsSnapshot,
      requestedPath: searchParams.get("from"),
    });

    let finalTarget = target;
    if (isStagingPublicSlice() && isStagingBlockedPathname(target.split("?")[0] ?? target)) {
      finalTarget = `${resolveFirstAccessiblePageHrefFromResolved(permissionsSnapshot.resolved)}?staging_unavailable=1`;
    }

    onRedirecting();
    deferredRouterReplace(router, finalTarget);
    deferredRouterRefresh(router);
  }, [status, user, permissionsLoading, permissionsSnapshot, router, searchParams, onRedirecting]);

  return null;
}
