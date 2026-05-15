/** Moduli allineati a `user_permissions.module` e RLS `user_effective_can`. */
export const GESTIONALE_PERMISSION_MODULES = [
  "magazzino",
  "preventivi",
  "lavorazioni",
  "mezzi",
  "report",
  "documenti",
] as const;

export type GestionalePermissionModule = (typeof GESTIONALE_PERMISSION_MODULES)[number];

/** Percorsi nav → modulo permessi (null = solo fallback ruolo, tipicamente read+ per interni). */
export function gestionaleNavHrefToModule(href: string): GestionalePermissionModule | null {
  if (href.startsWith("/magazzino")) return "magazzino";
  if (href.startsWith("/preventivi")) return "preventivi";
  if (href.startsWith("/lavorazioni")) return "lavorazioni";
  if (href.startsWith("/mezzi")) return "mezzi";
  if (href.startsWith("/report")) return "report";
  if (href.startsWith("/documenti")) return "documenti";
  return null;
}
