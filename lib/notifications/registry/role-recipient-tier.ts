import { resolveCanonicalRole } from "@/lib/rbac";
import type { NotificationRecipientTier } from "@/lib/notifications/notification-event-catalog";

/** Mappa role_key profilo → tier destinatario nel registry notifiche (normalizza legacy). */
export function roleKeyToRecipientTier(roleKey: string | null | undefined): NotificationRecipientTier | null {
  const canonical = resolveCanonicalRole(roleKey);
  switch (canonical) {
    case "admin":
    case "manager":
      return "admin";
    case "addetto_amministrativo":
      return "ufficio";
    case "operatore":
      return "officina";
    case "cliente":
      return "cliente";
    default:
      return null;
  }
}
