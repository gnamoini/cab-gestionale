import { resolveGestionaleNav, type GestionaleNavHref } from "@/components/gestionale/gestionale-nav-config";
import { isStagingBlockedPathname, isStagingPublicSlice } from "@/lib/env/staging-public";
import {
  ACCESS_DENIED_PATH,
  canAccessPage,
  shouldHideNavHref,
  type CanAccessPageOptions,
  type RbacUser,
} from "@/lib/auth/rbac";

const DASHBOARD_FALLBACK = "/dashboard";

/** Normalizza path `from` (sicurezza base, senza default). */
export function sanitizePostLoginRequestedPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/login")) return null;
  if (trimmed === ACCESS_DENIED_PATH || trimmed.startsWith(`${ACCESS_DENIED_PATH}/`)) return null;
  return trimmed;
}

function stagingBlocksRedirect(path: string): boolean {
  if (!isStagingPublicSlice()) return false;
  const pathOnly = path.split("?")[0] ?? path;
  return isStagingBlockedPathname(pathOnly);
}

/** Prima voce menu accessibile (ordine `GESTIONALE_NAV`), esclusi staging disabilitati. */
export function resolveFirstAccessibleNavHref(
  user: RbacUser,
  opts?: CanAccessPageOptions & { clientLavorazioniLoading?: boolean },
): string {
  const items = resolveGestionaleNav({
    hideHref: (href: GestionaleNavHref) =>
      shouldHideNavHref(user, href, {
        clientLavorazioniAllowed: opts?.clientLavorazioniAllowed,
        clientLavorazioniLoading: opts?.clientLavorazioniLoading,
      }),
  });
  const first = items.find((item) => !item.disabled);
  return first?.href ?? DASHBOARD_FALLBACK;
}

export type ResolvePostLoginRedirectInput = {
  user: RbacUser | null;
  /** Query `from` o deep link esplicito post-login. */
  requestedPath?: string | null;
} & CanAccessPageOptions;

/**
 * Destinazione post-login: deep link consentito, altrimenti prima pagina del menu,
 * fallback dashboard.
 */
export function resolvePostLoginRedirectPath(input: ResolvePostLoginRedirectInput): string {
  if (!input.user) return DASHBOARD_FALLBACK;

  const accessOpts: CanAccessPageOptions = {
    clientLavorazioniAllowed: input.clientLavorazioniAllowed,
  };

  const requested = sanitizePostLoginRequestedPath(input.requestedPath);
  if (
    requested &&
    !stagingBlocksRedirect(requested) &&
    canAccessPage(input.user, requested, accessOpts)
  ) {
    return requested;
  }

  return resolveFirstAccessibleNavHref(input.user, {
    ...accessOpts,
    clientLavorazioniLoading: false,
  });
}
