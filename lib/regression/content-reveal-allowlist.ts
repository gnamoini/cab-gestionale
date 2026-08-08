/**
 * SSOT: route con PageLayout contentReveal — mutualmente esclusivo con SkeletonBoundary L3.
 */

/** Route che abilitano fade-in L1/L2 su PageContent (nessun SkeletonBoundary sul body). */
export const CONTENT_REVEAL_PAGE_ROUTES = [
  "app/(gestionale)/dashboard/page.tsx",
  "app/(gestionale)/impostazioni/page.tsx",
  "app/(gestionale)/dipendenti/page.tsx",
  "app/(gestionale)/agenda/page.tsx",
  "app/(gestionale)/sicurezza/page.tsx",
  "app/(gestionale)/lavorazioni-clienti/page.tsx",
] as const;

/** View con SkeletonBoundary L3 — non devono avere contentReveal sulla stessa route. */
export const SKELETON_BOUNDARY_VIEW_FILES = [
  "components/gestionale/mezzi/mezzi-view.tsx",
  "components/gestionale/magazzino/magazzino-view.tsx",
  "components/gestionale/lavorazioni/lavorazioni-view.tsx",
  "components/preventivi/preventivi-view.tsx",
  "components/gestionale/documenti/documenti-view.tsx",
] as const;

/** Page file delle route lista — vietato contentReveal su PageLayout. */
export const SKELETON_BOUNDARY_PAGE_ROUTES = [
  "app/(gestionale)/mezzi/page.tsx",
  "app/(gestionale)/magazzino/page.tsx",
  "app/(gestionale)/lavorazioni/page.tsx",
  "app/(gestionale)/preventivi/page.tsx",
  "app/(gestionale)/documenti/page.tsx",
] as const;

/** Matrice browser target per validazione @starting-style / fallback keyframes. */
export const CONTENT_REVEAL_BROWSER_MATRIX = [
  "Chrome desktop (Playwright chromium)",
  "Safari/iOS (Playwright mobile-ios-chromium / WebKit cert)",
  "Android Chrome (Playwright mobile-android)",
] as const;
