/** Route rollout LEVEL 2: devono usare PageTransitionLoader in Suspense. */
export const PAGE_TRANSITION_LOADER_ROUTES = [
  "app/(gestionale)/agenda/page.tsx",
  "app/(gestionale)/dashboard/page.tsx",
  "app/(gestionale)/dipendenti/page.tsx",
  "app/(gestionale)/documenti/page.tsx",
  "app/(gestionale)/fatturazione/page.tsx",
  "app/(gestionale)/impostazioni/page.tsx",
  "app/(gestionale)/lavorazioni/page.tsx",
  "app/(gestionale)/lavorazioni-clienti/page.tsx",
  "app/(gestionale)/lavorazioni-clienti/[id]/page.tsx",
  "app/(gestionale)/magazzino/page.tsx",
  "app/(gestionale)/magazzino/carichi/page.tsx",
  "app/(gestionale)/magazzino/carichi/nuovo/page.tsx",
  "app/(gestionale)/mezzi/page.tsx",
  "app/(gestionale)/preventivi/page.tsx",
  "app/(gestionale)/report/page.tsx",
  "app/(gestionale)/sicurezza/page.tsx",
  "app/(gestionale)/sicurezza/production-readiness/page.tsx",
] as const;

/** Variant structural skeleton per route LEVEL 2. */
export const PAGE_TRANSITION_LOADER_VARIANTS: Record<
  (typeof PAGE_TRANSITION_LOADER_ROUTES)[number],
  | "agenda"
  | "dashboard"
  | "dipendenti"
  | "documenti"
  | "fatturazione"
  | "impostazioni"
  | "lavorazioni"
  | "clienti"
  | "client-detail"
  | "magazzino"
  | "mezzi"
  | "preventivi"
  | "report"
  | "sicurezza"
  | "production-readiness"
> = {
  "app/(gestionale)/agenda/page.tsx": "agenda",
  "app/(gestionale)/dashboard/page.tsx": "dashboard",
  "app/(gestionale)/dipendenti/page.tsx": "dipendenti",
  "app/(gestionale)/documenti/page.tsx": "documenti",
  "app/(gestionale)/fatturazione/page.tsx": "fatturazione",
  "app/(gestionale)/impostazioni/page.tsx": "impostazioni",
  "app/(gestionale)/lavorazioni/page.tsx": "lavorazioni",
  "app/(gestionale)/lavorazioni-clienti/page.tsx": "clienti",
  "app/(gestionale)/lavorazioni-clienti/[id]/page.tsx": "client-detail",
  "app/(gestionale)/magazzino/page.tsx": "magazzino",
  "app/(gestionale)/magazzino/carichi/page.tsx": "magazzino",
  "app/(gestionale)/magazzino/carichi/nuovo/page.tsx": "magazzino",
  "app/(gestionale)/mezzi/page.tsx": "mezzi",
  "app/(gestionale)/preventivi/page.tsx": "preventivi",
  "app/(gestionale)/report/page.tsx": "report",
  "app/(gestionale)/sicurezza/page.tsx": "sicurezza",
  "app/(gestionale)/sicurezza/production-readiness/page.tsx": "production-readiness",
};

/**
 * Route LEVEL 2 con PageLayout fuori Suspense (header continuo LEVEL 1→2).
 * Escluse: header dinamico/multi-step in view (dettaglio portale, wizard carichi nuovo).
 */
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
  "app/(gestionale)/preventivi/page.tsx",
  "app/(gestionale)/report/page.tsx",
  "app/(gestionale)/sicurezza/page.tsx",
  "app/(gestionale)/sicurezza/production-readiness/page.tsx",
] as const;

/** Eccezioni esplicite: fallback=null consentito (deny-by-default altrove). */
export const ALLOW_NULL_SUSPENSE_ROUTES = [
  "app/(gestionale)/impostazioni/ai-providers/page.tsx",
  "app/(gestionale)/report/design-system-preview/page.tsx",
] as const;

/** Route lazy+loading ancora su fallback=null — candidature LEVEL 2 future. */
export const FALLBACK_NULL_LEGACY_PENDING_ROUTES = [] as const;
