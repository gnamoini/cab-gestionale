"use client";

import { useMemo } from "react";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import {
  GESTIONALE_NAV,
  resolveGestionaleNav,
  type GestionaleNavHref,
} from "@/components/gestionale/gestionale-nav-config";
import { resolveFirstAccessibleNavHref } from "@/lib/auth/resolve-post-login-redirect";
import { useRbacNavAccess } from "@/src/hooks/use-rbac-nav-access";

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
  const { navAccess, isNavLoading, isNavReady } = useRbacNavAccess();

  const sessionReady = isAuthSessionEstablished(status);
  const ready = sessionReady && (isNavReady || !user?.id);

  return useMemo(() => {
    if (!ready || isNavLoading) {
      return { href: "/dashboard", label: "Caricamento…", ready: false };
    }

    if (!user?.id) {
      return { href: "/login", label: labelForGestionaleNavHref("/login"), ready: true };
    }

    if (!navAccess) {
      return { href: "/dashboard", label: labelForGestionaleNavHref("/dashboard"), ready: true };
    }

    const firstNavItem = resolveGestionaleNav({
      hideHref: (href) => navAccess.shouldHideHref(href),
    }).find((item) => !item.disabled && navAccess.canAccessHref(item.href));

    const href = firstNavItem?.href ?? resolveFirstAccessibleNavHref(navAccess);

    return {
      href,
      label: labelForGestionaleNavHref(href),
      ready: true,
    };
  }, [ready, isNavLoading, user, navAccess]);
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
  const { navAccess, isNavLoading, isNavReady } = useRbacNavAccess();

  const sessionReady = isAuthSessionEstablished(status);
  const ready = sessionReady && isNavReady && !isNavLoading && !!user?.id && !!navAccess;

  return useMemo(() => {
    if (!ready || !navAccess) {
      return { links: [], ready: false };
    }

    const items = resolveGestionaleNav({
      hideHref: (href) => navAccess.shouldHideHref(href),
    }).filter(
      (item) =>
        !item.disabled &&
        item.href !== excludeHref &&
        navAccess.canAccessHref(item.href),
    );

    return {
      ready: true,
      links: items.slice(0, max).map((item) => ({ href: item.href, label: item.label })),
    };
  }, [ready, navAccess, excludeHref, max]);
}
