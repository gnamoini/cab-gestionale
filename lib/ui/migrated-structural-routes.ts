/** Route migrate al Structural Skeleton System v3. */
export const MIGRATED_STRUCTURAL_ROUTES = [
  "magazzino",
  "mezzi",
  "documenti",
  "preventivi",
  "dashboard",
  "lavorazioni",
  "report",
  "agenda",
  "dipendenti",
  "fatturazione",
  "impostazioni",
  "sicurezza",
  "production-readiness",
  "clienti",
  "client-detail",
  "login",
] as const;

export type MigratedStructuralRoute = (typeof MIGRATED_STRUCTURAL_ROUTES)[number];
