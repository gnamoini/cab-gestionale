"use client";

import { useMemo } from "react";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import {
  GESTIONALE_NAV,
  resolveGestionaleNav,
  type GestionaleNavHref,
} from "@/components/gestionale/gestionale-nav-config";
import { resolveFirstAccessibleNavHref } from "@/lib/auth/resolve-post-login-redirect";
import {
  canAccessPage,
  shouldHideNavHref,
  type CanAccessPageOptions,
  type RbacEvaluationContext,
} from "@/lib/auth/rbac";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { useOperatorGlobalSettings } from "@/src/context/operator-global-settings-context";

export type SafeGestionaleHomeLink = {
  href: string;
  label: string;
  ready: boolean;
};

/** Etichetta CTA verso la prima destinazione menu (nome sezione, non “dashboard” fisso). */
export function labelForGestionaleNavHref(href: string): string {
  const item = GESTIONALE_NAV.find((entry) => entry.href === href);
  if (item) return `Vai a ${item.label}`;
  if (href === "/login") return "Accedi";
  return "Torna al gestionale";
}

/** Destinazione sicura post-errore / 404 — prima voce menu accessibile (come post-login). */
export function useSafeGestionaleHomeLink(): SafeGestionaleHomeLink {
  const { user, status } = useAuth();
  const clientLav = useClientLavorazioniAccess();
  const { isLoading: permsLoading } = useEffectivePermissions();

  const sessionReady = isAuthSessionEstablished(status);
  const permissionsReady = !user?.id || (!clientLav.isLoading && !permsLoading);
  const ready = sessionReady && permissionsReady;

  return useMemo(() => {
    if (!ready) {
      return { href: "/dashboard", label: "Caricamento…", ready: false };
    }

    if (!user?.id) {
      return { href: "/login", label: labelForGestionaleNavHref("/login"), ready: true };
    }

    const navOpts: CanAccessPageOptions & { clientLavorazioniLoading?: boolean } = {
      clientLavorazioniAllowed: clientLav.allowed,
      clientLavorazioniLoading: false,
    };

    const firstNavItem = resolveGestionaleNav({
      hideHref: (href) => shouldHideNavHref(user, href, navOpts),
    }).find((item) => !item.disabled && canAccessPage(user, item.href, navOpts));

    const href = firstNavItem?.href ?? resolveFirstAccessibleNavHref(user, navOpts);

    return {
      href,
      label: labelForGestionaleNavHref(href),
      ready: true,
    };
  }, [ready, user, clientLav.allowed]);
}

export type AccessibleQuickNavLink = {
  href: GestionaleNavHref;
  label: string;
};

/** Voci menu accessibili per collegamenti rapidi (es. 404 embedded). */
export function useAccessibleQuickNavLinks(opts?: {
  max?: number;
  excludeHref?: string;
}): { links: AccessibleQuickNavLink[]; ready: boolean } {
  const max = opts?.max ?? 4;
  const excludeHref = opts?.excludeHref;
  const { user, status } = useAuth();
  const clientLav = useClientLavorazioniAccess();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const operatorPilot = useOperatorGlobalSettings();

  const rbacCtx: RbacEvaluationContext = useMemo(
    () => snapshot?.rbacContext ?? { operatorGlobalSettingsDbEnabled: operatorPilot.dbEnabled },
    [snapshot?.rbacContext, operatorPilot.dbEnabled],
  );

  const sessionReady = isAuthSessionEstablished(status);
  const permissionsReady = !user?.id || (!clientLav.isLoading && !permsLoading);
  const ready = sessionReady && permissionsReady;

  const pageOpts = useMemo(
    () => ({ clientLavorazioniAllowed: clientLav.allowed }),
    [clientLav.allowed],
  );

  return useMemo(() => {
    if (!ready || !user?.id) {
      return { links: [], ready: false };
    }

    const items = resolveGestionaleNav({
      hideHref: (href) =>
        shouldHideNavHref(
          user,
          href,
          {
            clientLavorazioniAllowed: clientLav.allowed,
            clientLavorazioniLoading: clientLav.isLoading,
          },
          rbacCtx,
        ),
    }).filter(
      (item) =>
        !item.disabled &&
        item.href !== excludeHref &&
        canAccessPage(user, item.href, pageOpts, rbacCtx),
    );

    return {
      ready: true,
      links: items.slice(0, max).map((item) => ({ href: item.href, label: item.label })),
    };
  }, [ready, user, clientLav.allowed, clientLav.isLoading, excludeHref, max, pageOpts, rbacCtx]);
}
