import { isStagingPublicSlice, STAGING_MODULE_BADGE, STAGING_SAFE_HREFS } from "@/lib/env/staging-public";
import { GESTIONALE_PAGES, type GestionalePageHref } from "@/src/lib/permissions/gestionale-pages";
import type { GestionalePageIcon } from "@/src/lib/permissions/gestionale-pages";
import { isPageVisible, type ResolvedPageAccess } from "@/src/lib/rbac/resolve-page-access";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";

export {
  IconNavAgenda,
  IconNavDashboard,
  IconNavDipendenti,
  IconNavDocumenti,
  IconNavFatturazione,
  IconNavLavorazioni,
  IconNavLavorazioniClient,
  IconNavMagazzino,
  IconNavMezzi,
  IconNavPreventivi,
  IconNavReport,
  IconNavSecurity,
  IconNavSettings,
} from "@/src/lib/permissions/gestionale-page-icons";

/** @deprecated Usare buildGestionaleNav — mantenuto per compat type durante migrazione call-site. */
export const GESTIONALE_NAV = GESTIONALE_PAGES.filter((p) => p.showInNav).map((p) => ({
  href: p.href as GestionalePageHref,
  label: p.label,
  Icon: p.icon,
}));

export type GestionaleNavHref = GestionalePageHref;

export type GestionaleNavResolvedItem = {
  href: GestionaleNavHref;
  label: string;
  Icon: GestionalePageIcon;
  disabled: boolean;
  badge: string | null;
  pageKey: GestionalePageKey;
};

export type BuildGestionaleNavOptions = {
  hidePageKey?: (pageKey: GestionalePageKey) => boolean;
};

/** Menu sidebar — vista filtrata del catalogo pagine SSOT. */
export function buildGestionaleNav(
  resolved: ResolvedPageAccess,
  opts?: BuildGestionaleNavOptions,
): GestionaleNavResolvedItem[] {
  const staging = isStagingPublicSlice();
  const safe = new Set<string>(STAGING_SAFE_HREFS);

  return GESTIONALE_PAGES.filter((p) => p.showInNav)
    .filter((p) => isPageVisible(resolved, p.key as GestionalePageKey))
    .filter((p) => !opts?.hidePageKey?.(p.key as GestionalePageKey))
    .sort((a, b) => a.order - b.order)
    .map((p) => {
      const stagingDisabled = staging && !safe.has(p.href);
      return {
        href: p.href as GestionaleNavHref,
        label: p.label,
        Icon: p.icon,
        disabled: stagingDisabled,
        badge: stagingDisabled ? STAGING_MODULE_BADGE : null,
        pageKey: p.key as GestionalePageKey,
      };
    });
}

/** @deprecated Usare buildGestionaleNav con snapshot permessi. */
export type ResolveGestionaleNavOptions = {
  hideHref?: (href: GestionaleNavHref) => boolean;
};

/** @deprecated Usare buildGestionaleNav — senza RBAC mostra tutte le voci showInNav (solo staging filter). */
export function resolveGestionaleNav(opts?: ResolveGestionaleNavOptions): GestionaleNavResolvedItem[] {
  const staging = isStagingPublicSlice();
  const safe = new Set<string>(STAGING_SAFE_HREFS);
  return GESTIONALE_PAGES.filter((p) => p.showInNav)
    .filter((p) => !opts?.hideHref?.(p.href as GestionaleNavHref))
    .sort((a, b) => a.order - b.order)
    .map((p) => {
      const stagingDisabled = staging && !safe.has(p.href);
      return {
        href: p.href as GestionaleNavHref,
        label: p.label,
        Icon: p.icon,
        disabled: stagingDisabled,
        badge: stagingDisabled ? STAGING_MODULE_BADGE : null,
        pageKey: p.key as GestionalePageKey,
      };
    });
}
