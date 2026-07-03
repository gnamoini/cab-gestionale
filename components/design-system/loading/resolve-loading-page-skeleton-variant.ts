import type { LoadingPageSkeletonVariant } from "./loading-page-skeleton";

/**
 * Variante skeleton coerente con la route — usata dai gate auth/RBAC al posto dello spinner.
 */
export function resolveLoadingPageSkeletonVariant(pathname: string): LoadingPageSkeletonVariant {
  if (pathname.startsWith("/sicurezza/production-readiness")) return "production-readiness";
  if (pathname.startsWith("/sicurezza")) return "sicurezza";
  if (pathname.startsWith("/lavorazioni-clienti/") && pathname !== "/lavorazioni-clienti") {
    return "client-detail";
  }
  if (pathname.startsWith("/lavorazioni-clienti")) return "clienti";
  if (pathname.startsWith("/agenda")) return "agenda";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/lavorazioni")) return "lavorazioni";
  if (pathname.startsWith("/magazzino")) return "magazzino";
  if (pathname.startsWith("/mezzi")) return "mezzi";
  if (pathname.startsWith("/documenti")) return "documenti";
  if (pathname.startsWith("/preventivi")) return "preventivi";
  if (pathname.startsWith("/fatturazione")) return "fatturazione";
  if (pathname.startsWith("/dipendenti")) return "dipendenti";
  if (pathname.startsWith("/report")) return "report";
  if (pathname.startsWith("/impostazioni")) return "impostazioni";
  return "default";
}
