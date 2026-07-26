import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { recordAuditEvent } from "@/lib/audit/record";
import { getNotificationRegistryEntry } from "@/lib/notifications/notification-event-catalog";

export async function auditNotificationPreferenceChange(
  client: SupabaseClient,
  input: {
    userId: string;
    companyId: string;
    notificationEventId: string;
    before: { enabled: boolean } | null;
    after: { enabled: boolean } | null;
    action: "UPDATE" | "DELETE" | "RESTORE_ALL";
  },
): Promise<void> {
  const entry = getNotificationRegistryEntry(input.notificationEventId);
  // log_modifiche.entita_id è uuid — evento resta in context.oggetto / description
  try {
    await recordAuditEvent(client, {
      entityType: "notification_preference",
      entityId: input.userId,
      action: input.action === "DELETE" ? "DELETE" : "UPDATE",
      eventType: "SYSTEM_EVENT",
      autoreId: input.userId,
      companyId: input.companyId,
      module: "configurazione",
      title: "Preferenza notifica aggiornata",
      description: entry?.titleTemplate ?? input.notificationEventId,
      before: input.before,
      after: input.after,
      context: { oggetto: input.notificationEventId },
    });
  } catch {
    // ponytail: preferenza già persistita; audit non deve far fallire la mutazione
  }
}
