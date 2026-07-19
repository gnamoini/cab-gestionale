import type { AdminDashboardNotification } from "@/lib/notifications/admin-dashboard-notifications";
import type { PublishNotificationCommand } from "@/lib/notifications/application/publish-notification-command";
import {
  adminDashboardTestDedupKey,
  dipendentiPresenzeReminderDedupKey,
  fattureScaduteDigestDedupKey,
  lavorazioneCompletataDedupKey,
  lavorazioneCreatedDedupKey,
  magazzinoSottoScortaDedupKey,
  tagliandoDaEseguireDedupKey,
} from "@/lib/notifications/notification-dedup-keys";
import {
  isAdminDashboardTestNotification,
  isDipendentiPresenzeReminderNotification,
  isFattureScaduteDigestNotification,
  isLavorazioneCompletataNotification,
  isLavorazioneDashboardNotification,
  isMagazzinoDashboardNotification,
  isTagliandoDaEseguireNotification,
} from "@/lib/notifications/admin-dashboard-notifications";
import {
  buildAdminNotificationDipendentiHref,
  buildAdminNotificationFatturazioneHref,
  buildAdminNotificationLavorazioneHref,
  buildAdminNotificationMagazzinoHref,
  formatAdminNotificationDesktopBody,
  formatLavorazioneCompletataToastMessage,
  formatMagazzinoSottoScortaToastMessage,
} from "@/lib/lavorazioni/admin-notifications";
import { formatFattureScaduteDigestBody } from "@/lib/fatturazione/fatture-scadute-digest";
import {
  formatDipendentiPresenzeReminderDesktopBody,
  formatDipendentiPresenzeReminderTitle,
} from "@/lib/dipendenti/dipendenti-presenze-reminder";
import { formatTagliandoDaEseguireBody } from "@/lib/maintenance-plans/tagliando-due-notification-mapper";
import { emptySnapshot } from "@/lib/notifications/domain/notification-snapshot";

function idempotencyFromDedup(dedupKey: string): string {
  return `idem:${dedupKey}`;
}

export function legacyNotificationToCommand(
  userId: string,
  notification: AdminDashboardNotification,
): PublishNotificationCommand | null {
  if (isLavorazioneDashboardNotification(notification)) {
    const dedupKey = lavorazioneCreatedDedupKey(notification.lavorazioneId);
    return {
      notificationType: "lavorazione_created",
      sourceDomainEvent: "work_order.created",
      translationKey: "notification.lavorazione_created",
      translationParams: {
        cliente: notification.cliente,
        titolo: notification.titolo,
        lavorazioneId: notification.lavorazioneId,
      },
      snapshot: {
        customerName: notification.cliente,
        workOrderCode: notification.lavorazioneId,
      },
      title: notification.cliente?.trim() || notification.titolo?.trim() || "Nuova lavorazione",
      body: formatAdminNotificationDesktopBody(notification),
      deepLink: buildAdminNotificationLavorazioneHref(notification.lavorazioneId),
      entityType: "lavorazioni",
      entityId: notification.lavorazioneId,
      dedupKey,
      idempotencyKey: idempotencyFromDedup(dedupKey),
    };
  }

  if (isLavorazioneCompletataNotification(notification)) {
    const dedupKey = lavorazioneCompletataDedupKey(notification.lavorazioneId);
    return {
      notificationType: "lavorazione_completata",
      sourceDomainEvent: "work_order.completed",
      translationKey: "notification.lavorazione_completata",
      translationParams: { lavorazioneId: notification.lavorazioneId },
      snapshot: { workOrderCode: notification.lavorazioneId, customerName: notification.cliente },
      title: notification.cliente?.trim() || notification.titolo?.trim() || "Lavorazione completata",
      body: formatLavorazioneCompletataToastMessage(notification),
      deepLink: buildAdminNotificationLavorazioneHref(notification.lavorazioneId),
      entityType: "lavorazioni",
      entityId: notification.lavorazioneId,
      dedupKey,
      idempotencyKey: idempotencyFromDedup(dedupKey),
    };
  }

  if (isMagazzinoDashboardNotification(notification)) {
    const dedupKey = magazzinoSottoScortaDedupKey(notification.ricambioId);
    return {
      notificationType: "magazzino_sotto_scorta",
      sourceDomainEvent: "inventory.below_minimum",
      translationKey: "notification.magazzino_sotto_scorta",
      translationParams: { ricambioId: notification.ricambioId },
      snapshot: { partName: notification.descrizione },
      title: notification.esaurito
        ? notification.descrizione?.trim() || "Ricambio esaurito"
        : notification.descrizione?.trim() || "Sotto scorta minima",
      body: formatMagazzinoSottoScortaToastMessage(notification),
      deepLink: buildAdminNotificationMagazzinoHref(notification.ricambioId),
      entityType: "magazzino_ricambi",
      entityId: notification.ricambioId,
      dedupKey,
      idempotencyKey: idempotencyFromDedup(dedupKey),
    };
  }

  if (isFattureScaduteDigestNotification(notification)) {
    const dedupKey = fattureScaduteDigestDedupKey(notification.dateYmd);
    return {
      notificationType: "fatture_scadute_digest",
      sourceDomainEvent: "invoice.overdue_digest",
      translationKey: "notification.fatture_scadute_digest",
      translationParams: { dateYmd: notification.dateYmd, count: notification.count },
      snapshot: { amount: String(notification.count) },
      title: `${notification.count} fatture scadute`,
      body: formatFattureScaduteDigestBody(notification),
      deepLink: buildAdminNotificationFatturazioneHref(),
      dedupKey,
      idempotencyKey: idempotencyFromDedup(dedupKey),
    };
  }

  if (isDipendentiPresenzeReminderNotification(notification)) {
    const dedupKey = dipendentiPresenzeReminderDedupKey(notification.dateYmd);
    return {
      notificationType: "dipendenti_presenze_reminder",
      sourceDomainEvent: "employees.presence_reminder",
      translationKey: "notification.dipendenti_presenze_reminder",
      translationParams: { dateYmd: notification.dateYmd, count: notification.count },
      snapshot: emptySnapshot(),
      title: formatDipendentiPresenzeReminderTitle(notification.count),
      body: formatDipendentiPresenzeReminderDesktopBody(notification),
      deepLink: buildAdminNotificationDipendentiHref(),
      dedupKey,
      idempotencyKey: idempotencyFromDedup(dedupKey),
    };
  }

  if (isTagliandoDaEseguireNotification(notification)) {
    const dedupKey = tagliandoDaEseguireDedupKey(notification.lavorazioneId);
    return {
      notificationType: "tagliando_da_eseguire",
      sourceDomainEvent: "maintenance.due",
      translationKey: "notification.tagliando_da_eseguire",
      translationParams: { lavorazioneId: notification.lavorazioneId },
      snapshot: { workOrderCode: notification.lavorazioneId },
      title: "Tagliando da eseguire",
      body: formatTagliandoDaEseguireBody(notification),
      deepLink: "/mezzi",
      entityType: "lavorazioni",
      entityId: notification.lavorazioneId,
      dedupKey,
      idempotencyKey: idempotencyFromDedup(dedupKey),
    };
  }

  if (isAdminDashboardTestNotification(notification)) {
    const dedupKey = adminDashboardTestDedupKey(userId);
    return {
      notificationType: "admin_dashboard_test",
      translationKey: "notification.admin_dashboard_test",
      translationParams: { message: notification.message },
      snapshot: emptySnapshot(),
      title: "Test notifiche",
      body: notification.message,
      deepLink: "/dashboard",
      dedupKey,
      idempotencyKey: idempotencyFromDedup(dedupKey),
    };
  }

  return null;
}
