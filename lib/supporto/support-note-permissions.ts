import { hasPermission, type RbacUser } from "@/lib/auth/rbac";

export const SUPPORT_NOTE_MODERATION_DENIED =
  "Solo gli amministratori possono eliminare o risolvere le note.";

/** Elimina / risolvi nota — solo admin (capability `can_manage_security`). */
export function canModerateSupportNotes(user: RbacUser): boolean {
  return hasPermission(user, "manageSecurity");
}
