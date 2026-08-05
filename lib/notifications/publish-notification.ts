"use client";

import {
  loadAdminNotificationStore,
  upsertAdminNotification,
} from "@/lib/lavorazioni/admin-notification-store";
import {
  formatAdminNotificationDesktopBody,
  buildAdminNotificationDipendentiHref,
  buildAdminNotificationFatturazioneHref,
  buildAdminNotificationLavorazioneHref,
  buildAdminNotificationMagazzinoHref,
  formatLavorazioneCompletataToastMessage,
  formatMagazzinoSottoScortaToastMessage,
} from "@/lib/lavorazioni/admin-notifications";
import { formatFattureScaduteDigestBody } from "@/lib/fatturazione/fatture-scadute-digest";
import {
  formatDipendentiPresenzeReminderDesktopBody,
  formatDipendentiPresenzeReminderTitle,
} from "@/lib/dipendenti/dipendenti-presenze-reminder";
import {
  getDesktopNotificationPermissionState,
  showDesktopAdminNotification,
} from "@/lib/lavorazioni/desktop-notifications";
import { createNotification } from "@/lib/notifications/create-notification";
import type { CreateNotificationInput } from "@/lib/notifications/notification-types";
import { adminDashboardTestDedupKey } from "@/lib/notifications/notification-dedup-keys";
import {
  notificationsV2WritesDb,
  notificationsV2WritesLegacy,
  resolveNotificationsV2Mode,
  type NotificationsV2Mode,
} from "@/lib/notifications/notifications-v2-flag";
import {
  isAdminDashboardTestNotification,
  isDipendentiPresenzeReminderNotification,
  isFattureScaduteDigestNotification,
  isLavorazioneCompletataNotification,
  isLavorazioneDashboardNotification,
  isLavorazioniRitardoDigestNotification,
  isMagazzinoDashboardNotification,
  isTagliandoDaEseguireNotification,
  notificationStoreKey,
  type AdminDashboardNotification,
} from "@/lib/notifications/admin-dashboard-notifications";
import { legacyNotificationToCommand } from "@/lib/notifications/adapters/legacy-admin-dashboard";
import { publishNotificationCommand } from "@/lib/notifications/application/notification-service.client";
import { notificationsSsotV2Enabled } from "@/lib/notifications/notifications-ssot-v2-flag";
import { trackDeprecatedUsage } from "@/lib/observability/deprecated-usage";
import { formatTagliandoDaEseguireBody } from "@/lib/maintenance-plans/tagliando-due-notification-mapper";
import { dispatchNotificationViaApi } from "@/lib/notifications/dispatch/dispatch-notification.client";
import { getNotificationRegistryEntry } from "@/lib/notifications/notification-event-catalog";
import { entityDispatchIdempotencyKey } from "@/lib/notifications/dispatch/entity-idempotency";

export type PublishNotificationResult = { added: boolean; desktop: boolean };

function notificationEventIdFromLegacy(notification: AdminDashboardNotification): string | null {
  if (isLavorazioneDashboardNotification(notification)) return "lavorazioni.created";
  if (isLavorazioneCompletataNotification(notification)) return "lavorazioni.completed";
  if (isMagazzinoDashboardNotification(notification)) return "magazzino.below_minimum";
  if (isFattureScaduteDigestNotification(notification)) return "fatturazione.overdue_digest";
  if (isLavorazioniRitardoDigestNotification(notification)) return "lavorazioni.overdue_digest";
  if (isDipendentiPresenzeReminderNotification(notification)) return "dipendenti.presence_reminder";
  if (isTagliandoDaEseguireNotification(notification)) return "lavorazioni.tagliando_due";
  return null;
}

function dispatchIdempotencyKeyFromLegacy(notification: AdminDashboardNotification): string {
  if (isLavorazioneDashboardNotification(notification)) {
    return entityDispatchIdempotencyKey("lavorazioni.created", "lavorazioni", notification.lavorazioneId);
  }
  if (isLavorazioneCompletataNotification(notification)) {
    return entityDispatchIdempotencyKey("lavorazioni.completed", "lavorazioni", notification.lavorazioneId);
  }
  if (isMagazzinoDashboardNotification(notification)) {
    return entityDispatchIdempotencyKey("magazzino.below_minimum", "magazzino_ricambi", notification.ricambioId);
  }
  if (isFattureScaduteDigestNotification(notification)) {
    return entityDispatchIdempotencyKey("fatturazione.overdue_digest", "fatturazione", notification.dateYmd);
  }
  if (isDipendentiPresenzeReminderNotification(notification)) {
    return entityDispatchIdempotencyKey("dipendenti.presence_reminder", "dipendenti_presenze", notification.dateYmd);
  }
  if (isTagliandoDaEseguireNotification(notification)) {
    return entityDispatchIdempotencyKey("lavorazioni.tagliando_due", "lavorazioni", notification.lavorazioneId);
  }
  const key = notificationStoreKey(notification);
  return `${key}:legacy`;
}

function legacyToCreateInput(notification: AdminDashboardNotification): CreateNotificationInput {
  const cmd = legacyNotificationToCommand("legacy", notification);
  if (!cmd) throw new Error("unsupported_notification");
  return {
    type: cmd.notificationType,
    title: cmd.title,
    body: cmd.body,
    href: cmd.deepLink,
    entity_type: cmd.entityType ?? null,
    entity_id: cmd.entityId ?? null,
    dedup_key: cmd.dedupKey,
  };
}

function desktopPayloadFromLegacy(notification: AdminDashboardNotification) {
  const key = notificationStoreKey(notification);
  if (isLavorazioneDashboardNotification(notification)) {
    return {
      title: "Nuova lavorazione",
      body: formatAdminNotificationDesktopBody(notification),
      href: buildAdminNotificationLavorazioneHref(notification.lavorazioneId),
      tag: key,
    };
  }
  if (isLavorazioneCompletataNotification(notification)) {
    return {
      title: "Lavorazione completata",
      body: formatLavorazioneCompletataToastMessage(notification),
      href: buildAdminNotificationLavorazioneHref(notification.lavorazioneId),
      tag: key,
    };
  }
  if (isMagazzinoDashboardNotification(notification)) {
    return {
      title: notification.esaurito ? "Ricambio esaurito" : "Sotto scorta minima",
      body: formatMagazzinoSottoScortaToastMessage(notification),
      href: buildAdminNotificationMagazzinoHref(notification.ricambioId),
      tag: key,
    };
  }
  if (isFattureScaduteDigestNotification(notification)) {
    return {
      title: `${notification.count} fatture scadute`,
      body: formatFattureScaduteDigestBody(notification),
      href: buildAdminNotificationFatturazioneHref(),
      tag: key,
    };
  }
  if (isDipendentiPresenzeReminderNotification(notification)) {
    return {
      title: formatDipendentiPresenzeReminderTitle(notification.count),
      body: formatDipendentiPresenzeReminderDesktopBody(notification),
      href: buildAdminNotificationDipendentiHref(),
      tag: key,
    };
  }
  if (isTagliandoDaEseguireNotification(notification)) {
    return {
      title: "Tagliando da eseguire",
      body: formatTagliandoDaEseguireBody(notification),
      href: "/mezzi",
      tag: key,
    };
  }
  if (isAdminDashboardTestNotification(notification)) {
    return {
      title: "Test notifiche",
      body: notification.message,
      href: "/dashboard",
      tag: key,
    };
  }
  return null;
}

function dispatchDesktop(notification: AdminDashboardNotification): boolean {
  if (getDesktopNotificationPermissionState() !== "granted") return false;
  const payload = desktopPayloadFromLegacy(notification);
  if (!payload) return false;
  showDesktopAdminNotification(payload);
  return true;
}

/** Facade — delegates to NotificationService when SSOT v4 enabled. */
export async function publishNotification(
  userId: string,
  notification: AdminDashboardNotification,
  mode: NotificationsV2Mode,
): Promise<PublishNotificationResult> {
  let added = false;
  let desktop = false;

  if (notificationsV2WritesLegacy(mode)) {
    trackDeprecatedUsage("notification-localstorage-fallback", { mode });
    const key = notificationStoreKey(notification);
    const existed = Boolean(loadAdminNotificationStore(userId).items[key]);
    upsertAdminNotification(userId, notification);
    added = !existed;
    if (added) desktop = dispatchDesktop(notification);
  }

  if (notificationsV2WritesDb(mode)) {
    const fanoutEventId = notificationEventIdFromLegacy(notification);
    if (notificationsSsotV2Enabled() && fanoutEventId && getNotificationRegistryEntry(fanoutEventId)) {
      const dispatchResult = await dispatchNotificationViaApi({
        notificationEventId: fanoutEventId,
        dispatchIdempotencyKey: dispatchIdempotencyKeyFromLegacy(notification),
        actorId: userId,
        legacyNotification: notification,
      });
      if (dispatchResult.created > 0) {
        added = true;
      }
    } else if (notificationsSsotV2Enabled()) {
      const cmd = legacyNotificationToCommand(userId, notification);
      if (cmd) {
        if (isAdminDashboardTestNotification(notification)) {
          cmd.dedupKey = adminDashboardTestDedupKey(userId);
          cmd.idempotencyKey = `idem:${cmd.dedupKey}`;
        }
        const result = await publishNotificationCommand(cmd);
        if (result.created) {
          added = true;
        } else if (!notificationsV2WritesLegacy(mode)) {
          added = false;
        }
      }
    } else {
      const input = legacyToCreateInput(notification);
      if (isAdminDashboardTestNotification(notification)) {
        input.dedup_key = adminDashboardTestDedupKey(userId);
      }
      const result = await createNotification(input);
      if (result.inserted) {
        added = true;
        desktop = dispatchDesktop(notification);
      } else if (!notificationsV2WritesLegacy(mode)) {
        added = false;
      }
    }
  }

  return { added, desktop };
}

/** @deprecated Usare publishNotification con mode. */
export async function publishAdminDashboardNotification(
  userId: string,
  notification: AdminDashboardNotification,
): Promise<PublishNotificationResult> {
  return publishNotification(userId, notification, resolveNotificationsV2Mode(null));
}
