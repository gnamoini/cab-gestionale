import type { GestionalePageKey, PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import { allGestionalePageKeys } from "@/src/lib/permissions/gestionale-pages";
import type { CanonicalRole } from "@/lib/rbac";

/** Seed matrice ruolo×pagina — solo migrazioni e test fixture. */
export const RBAC_PAGE_SEED_MATRIX: Record<CanonicalRole, Partial<Record<GestionalePageKey, PageAccessLevel>>> = {
  admin: Object.fromEntries(allGestionalePageKeys().map((k) => [k, "write" as const])),
  manager: {
    dashboard: "write",
    agenda: "write",
    lavorazioni: "write",
    lavorazioni_clienti: "none",
    preventivi: "write",
    fatturazione: "write",
    documenti: "write",
    magazzino: "write",
    magazzino_carichi: "write",
    mezzi: "write",
    dipendenti: "write",
    report: "write",
    impostazioni: "write",
    sicurezza: "none",
  },
  operatore: {
    dashboard: "none",
    agenda: "write",
    lavorazioni: "write",
    lavorazioni_clienti: "none",
    preventivi: "none",
    fatturazione: "none",
    documenti: "write",
    magazzino: "write",
    magazzino_carichi: "write",
    mezzi: "write",
    dipendenti: "none",
    report: "none",
    impostazioni: "none",
    sicurezza: "none",
  },
  addetto_amministrativo: {
    dashboard: "write",
    agenda: "write",
    lavorazioni: "none",
    lavorazioni_clienti: "none",
    preventivi: "write",
    fatturazione: "write",
    documenti: "none",
    magazzino: "none",
    magazzino_carichi: "none",
    mezzi: "none",
    dipendenti: "none",
    report: "write",
    impostazioni: "none",
    sicurezza: "none",
  },
  guest: {
    dashboard: "read",
    agenda: "read",
    lavorazioni: "none",
    lavorazioni_clienti: "none",
    preventivi: "read",
    fatturazione: "none",
    documenti: "read",
    magazzino: "read",
    magazzino_carichi: "read",
    mezzi: "read",
    dipendenti: "read",
    report: "read",
    impostazioni: "none",
    sicurezza: "none",
  },
  cliente: {
    dashboard: "none",
    agenda: "none",
    lavorazioni: "none",
    lavorazioni_clienti: "read",
    preventivi: "none",
    fatturazione: "none",
    documenti: "none",
    magazzino: "none",
    magazzino_carichi: "none",
    mezzi: "none",
    dipendenti: "none",
    report: "none",
    impostazioni: "none",
    sicurezza: "none",
  },
};

export function seedPageAccessForRole(roleKey: string): Record<string, PageAccessLevel> {
  const seed = RBAC_PAGE_SEED_MATRIX[roleKey as CanonicalRole];
  if (!seed) return {};
  const out: Record<string, PageAccessLevel> = {};
  for (const key of allGestionalePageKeys()) {
    out[key] = seed[key] ?? "none";
  }
  return out;
}
