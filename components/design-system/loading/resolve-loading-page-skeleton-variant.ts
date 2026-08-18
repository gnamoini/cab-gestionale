import type { LoadingPageSkeletonVariant } from "./loading-page-skeleton";

/** Primo match vince — ordine per specificità (sotto-route prima). */
const SKELETON_PREFIXES: readonly { prefix: string; variant: LoadingPageSkeletonVariant }[] = [
  { prefix: "/sicurezza/production-readiness", variant: "production-readiness" },
  { prefix: "/lavorazioni-clienti/", variant: "client-detail" },
  { prefix: "/sicurezza", variant: "sicurezza" },
  { prefix: "/lavorazioni-clienti", variant: "clienti" },
  { prefix: "/agenda", variant: "agenda" },
  { prefix: "/dashboard", variant: "dashboard" },
  { prefix: "/lavorazioni", variant: "lavorazioni" },
  { prefix: "/magazzino", variant: "magazzino" },
  { prefix: "/mezzi", variant: "mezzi" },
  { prefix: "/documenti", variant: "documenti" },
  { prefix: "/preventivi", variant: "preventivi" },
  { prefix: "/ordini-fornitori", variant: "ordini_fornitori" },
  { prefix: "/fatturazione", variant: "fatturazione" },
  { prefix: "/dipendenti", variant: "dipendenti" },
  { prefix: "/report", variant: "report" },
  { prefix: "/impostazioni", variant: "impostazioni" },
];

/**
 * Variante skeleton coerente con la route — usata dai gate auth/RBAC al posto dello spinner.
 */
export function resolveLoadingPageSkeletonVariant(pathname: string): LoadingPageSkeletonVariant {
  for (const { prefix, variant } of SKELETON_PREFIXES) {
    if (prefix.endsWith("/")) {
      if (pathname.startsWith(prefix) && pathname !== prefix.slice(0, -1)) return variant;
      continue;
    }
    if (pathname.startsWith(prefix)) return variant;
  }
  return "default";
}
