/** Route con PageLayout fuori async body (header continuo da loading → page). */
export const PAGE_LAYOUT_OUTSIDE_SUSPENSE_ROUTES = [
  "app/(gestionale)/agenda/page.tsx",
  "app/(gestionale)/dashboard/page.tsx",
  "app/(gestionale)/dipendenti/page.tsx",
  "app/(gestionale)/documenti/page.tsx",
  "app/(gestionale)/fatturazione/page.tsx",
  "app/(gestionale)/impostazioni/page.tsx",
  "app/(gestionale)/lavorazioni/page.tsx",
  "app/(gestionale)/lavorazioni-clienti/page.tsx",
  "app/(gestionale)/magazzino/page.tsx",
  "app/(gestionale)/magazzino/carichi/page.tsx",
  "app/(gestionale)/mezzi/page.tsx",
  "app/(gestionale)/ordini-fornitori/page.tsx",
  "app/(gestionale)/preventivi/page.tsx",
  "app/(gestionale)/report/page.tsx",
  "app/(gestionale)/sicurezza/page.tsx",
  "app/(gestionale)/sicurezza/production-readiness/page.tsx",
] as const;

/** Route migrate L1 — vietato PageTransitionLoader / Suspense skeleton in page.tsx. */
export const MIGRATED_LOADING_OWNER_ROUTES = [
  ...PAGE_LAYOUT_OUTSIDE_SUSPENSE_ROUTES,
  "app/(gestionale)/lavorazioni-clienti/[id]/page.tsx",
  "app/(gestionale)/magazzino/carichi/nuovo/page.tsx",
] as const;

/** @deprecated LEVEL 2 legacy — non usare su route migrate. */
export const PAGE_TRANSITION_LOADER_ROUTES = [] as const;

/** @deprecated */
export const PAGE_TRANSITION_LOADER_VARIANTS = {} as const;

/** Eccezioni esplicite: fallback=null consentito (deny-by-default altrove). */
export const ALLOW_NULL_SUSPENSE_ROUTES = [
  "app/(gestionale)/impostazioni/ai-providers/page.tsx",
  "app/(gestionale)/report/design-system-preview/page.tsx",
] as const;

/** Route lazy+loading ancora su fallback=null — candidature future. */
export const FALLBACK_NULL_LEGACY_PENDING_ROUTES = [] as const;
