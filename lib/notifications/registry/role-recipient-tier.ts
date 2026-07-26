import type { NotificationRecipientTier } from "@/lib/notifications/notification-event-catalog";

/** Mappa role_key profilo → tier destinatario nel registry notifiche. */
export function roleKeyToRecipientTier(roleKey: string | null | undefined): NotificationRecipientTier | null {
  switch (roleKey) {
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
