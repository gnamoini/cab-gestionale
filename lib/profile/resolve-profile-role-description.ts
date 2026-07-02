import type { AppRole } from "@/lib/auth/rbac";

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Accesso completo al gestionale",
  manager: "Gestione operativa e impostazioni",
  operatore: "Gestione officina e interventi",
  addetto_amministrativo: "Gestione amministrativa e documenti",
  cliente: "Accesso al portale clienti",
  guest: "Accesso in sola lettura",
};

/** Breve descrizione ruolo per UI profilo. */
export function resolveProfileRoleDescription(role: AppRole): string {
  return ROLE_DESCRIPTIONS[role] ?? ROLE_DESCRIPTIONS.guest;
}