/** Route rollout LEVEL 2: devono usare PageTransitionLoader in Suspense. */
export const PAGE_TRANSITION_LOADER_ROUTES = [
  "app/(gestionale)/magazzino/page.tsx",
  "app/(gestionale)/dashboard/page.tsx",
  "app/(gestionale)/lavorazioni/page.tsx",
] as const;

/** Eccezioni esplicite: fallback=null consentito (deny-by-default altrove). */
export const ALLOW_NULL_SUSPENSE_ROUTES = [
  "app/(gestionale)/magazzino/carichi/page.tsx",
  "app/(gestionale)/magazzino/carichi/nuovo/page.tsx",
  "app/(gestionale)/impostazioni/ai-providers/page.tsx",
  "app/(gestionale)/report/design-system-preview/page.tsx",
] as const;

/** Route lazy+loading ancora su fallback=null — candidature LEVEL 2 future. */
export const FALLBACK_NULL_LEGACY_PENDING_ROUTES = [
  "app/(gestionale)/agenda/page.tsx",
  "app/(gestionale)/dipendenti/page.tsx",
  "app/(gestionale)/documenti/page.tsx",
  "app/(gestionale)/fatturazione/page.tsx",
  "app/(gestionale)/impostazioni/page.tsx",
  "app/(gestionale)/lavorazioni-clienti/page.tsx",
  "app/(gestionale)/lavorazioni-clienti/[id]/page.tsx",
  "app/(gestionale)/mezzi/page.tsx",
  "app/(gestionale)/preventivi/page.tsx",
  "app/(gestionale)/report/page.tsx",
  "app/(gestionale)/sicurezza/page.tsx",
  "app/(gestionale)/sicurezza/production-readiness/page.tsx",
] as const;
