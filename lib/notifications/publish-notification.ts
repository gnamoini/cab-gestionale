"use client";

import {
  loadAdminNotificationStore,
  upsertAdminNotification,
} from "@/lib/lavorazioni/admin-notification-store";
import {
  formatAdminNotificationDesktopBody,
  buildAdminNotificationDashboardHref,
  buildAdminNotificationDipendentiHref,
  buildAdminNotificationFatturazioneHref,
  buildAdminNotificationLavorazioneHref,
  buildAdminNotificationMagazzinoHref,
  buildAdminNotificationPreventivoHref,
  formatLavorazioneCompletataToastMessage,
  formatMagazzinoSottoScortaToastMessage,
} from "@/lib/lavorazioni/admin-notifications";
import { formatLavorazioniRitardoDigestBody } from "@/lib/lavorazioni/lavorazioni-ritardo-digest";
import { formatFattureScaduteDigestBody } from "@/lib/fatturazione/fatture-scadute-digest";
import {
  formatDashboardPromemoriaReminderDesktopBody,
  DASHBOARD_PROMEMORIA_REMINDER_DESKTOP_TITLE,
} from "@/lib/dashboard/dashboard-promemoria-reminder";
import {
  DIPENDENTI_PRESENZE_REMINDER_DESKTOP_TITLE,
  formatDipendentiPresenzeReminderDesktopBody,
} from "@/lib/dipendenti/dipendenti-presenze-reminder";
import {
  getDesktopNotificationPermissionState,
  showDesktopAdminNotification,
} from "@/lib/lavorazioni/desktop-notifications";
import { createNotification } from "@/lib/notifications/create-notification";
import type { CreateNotificationInput } from "@/lib/notifications/notification-types";
import {
  adminDashboardTestDedupKey,
  dashboardPromemoriaReminderDedupKey,
  dipendentiPresenzeReminderDedupKey,
  fattureScaduteDigestDedupKey,
  lavorazioneCompletataDedupKey,
  lavorazioneCreatedDedupKey,
  lavorazioniRitardoDigestDedupKey,
  magazzinoSottoScortaDedupKey,
  preventivoApprovatoDedupKey,
} from "@/lib/notifications/notification-dedup-keys";
import {
  notificationsV2WritesDb,
  notificationsV2WritesLegacy,
  resolveNotificationsV2Mode,
  type NotificationsV2Mode,
} from "@/lib/notifications/notifications-v2-flag";
import {
  isAdminDashboardTestNotification,
  isDashboardPromemoriaReminderNotification,
  isDipendentiPresenzeReminderNotification,
  isFattureScaduteDigestNotification,
  isLavorazioneCompletataNotification,
  isLavorazioneDashboardNotification,
  isLavorazioniRitardoDigestNotification,
  isMagazzinoDashboardNotification,
  isPreventivoApprovatoNotification,
  notificationStoreKey,
  type AdminDashboardNotification,
} from "@/lib/notifications/admin-dashboard-notifications";

export type PublishNotificationResult = { added: boolean; desktop: boolean };

function legacyToCreateInput(notification: AdminDashboardNotification): CreateNotificationInput {
  if (isLavorazioneDashboardNotification(notification)) {
    return {
      type: "lavorazione_created",
      title: notification.cliente?.trim() || notification.titolo?.trim() || "Nuova lavorazione",
      body: formatAdminNotificationDesktopBody(notification),
      href: buildAdminNotificationLavorazioneHref(notification.lavorazioneId),
      entity_type: "lavorazioni",
      entity_id: notification.lavorazioneId,
      dedup_key: lavorazioneCreatedDedupKey(notification.lavorazioneId),
    };
  }
  if (isLavorazioneCompletataNotification(notification)) {
    return {
      type: "lavorazione_completata",
      title: notification.cliente?.trim() || notification.titolo?.trim() || "Lavorazione completata",
      body: formatLavorazioneCompletataToastMessage(notification),
      href: buildAdminNotificationLavorazioneHref(notification.lavorazioneId),
      entity_type: "lavorazioni",
      entity_id: notification.lavorazioneId,
      dedup_key: lavorazioneCompletataDedupKey(notification.lavorazioneId),
    };
  }
  if (isLavorazioniRitardoDigestNotification(notification)) {
    return {
      type: "lavorazioni_ritardo_digest",
      title: `${notification.count} lavorazioni in ritardo`,
      body: formatLavorazioniRitardoDigestBody(notification),
      href: "/lavorazioni",
      dedup_key: lavorazioniRitardoDigestDedupKey(notification.dateYmd),
    };
  }
  if (isPreventivoApprovatoNotification(notification)) {
    const title = notification.numero?.trim() || "Preventivo approvato";
    const body = [notification.cliente?.trim(), notification.numero?.trim()].filter(Boolean).join(" · ")
      || "Preventivo approvato — procedi con fatturazione/DDT.";
    return {
      type: "preventivo_approvato",
      title,
      body,
      href: buildAdminNotificationPreventivoHref(notification.preventivoId),
      entity_type: "preventivi",
      entity_id: notification.preventivoId,
      dedup_key: preventivoApprovatoDedupKey(notification.preventivoId),
    };
  }
  if (isMagazzinoDashboardNotification(notification)) {
    return {
      type: "magazzino_sotto_scorta",
      title: notification.esaurito
        ? notification.descrizione?.trim() || "Ricambio esaurito"
        : notification.descrizione?.trim() || "Sotto scorta minima",
      body: formatMagazzinoSottoScortaToastMessage(notification),
      href: buildAdminNotificationMagazzinoHref(notification.ricambioId),
      entity_type: "magazzino_ricambi",
      entity_id: notification.ricambioId,
      dedup_key: magazzinoSottoScortaDedupKey(notification.ricambioId),
    };
  }
  if (isFattureScaduteDigestNotification(notification)) {
    return {
      type: "fatture_scadute_digest",
      title: `${notification.count} fatture scadute`,
      body: formatFattureScaduteDigestBody(notification),
      href: buildAdminNotificationFatturazioneHref(),
      dedup_key: fattureScaduteDigestDedupKey(notification.dateYmd),
    };
  }
  if (isDipendentiPresenzeReminderNotification(notification)) {
    return {
      type: "dipendenti_presenze_reminder",
      title: DIPENDENTI_PRESENZE_REMINDER_DESKTOP_TITLE,
      body: formatDipendentiPresenzeReminderDesktopBody(notification.dateYmd),
      href: buildAdminNotificationDipendentiHref(),
      dedup_key: dipendentiPresenzeReminderDedupKey(notification.dateYmd),
    };
  }
  if (isDashboardPromemoriaReminderNotification(notification)) {
    return {
      type: "dashboard_promemoria_reminder",
      title: notification.title?.trim() || DASHBOARD_PROMEMORIA_REMINDER_DESKTOP_TITLE,
      body: formatDashboardPromemoriaReminderDesktopBody(
        notification.title,
        notification.description,
        notification.eventTime,
      ),
      href: buildAdminNotificationDashboardHref(),
      entity_type: "dashboard_promemoria",
      entity_id: notification.promemoriaId,
      dedup_key: dashboardPromemoriaReminderDedupKey(notification.promemoriaId, notification.eventDateYmd),
    };
  }
  if (isAdminDashboardTestNotification(notification)) {
    return {
      type: "admin_dashboard_test",
      title: "Test notifiche",
      body: notification.message,
      href: "/dashboard",
      dedup_key: adminDashboardTestDedupKey(notification.id.split(":")[1] ?? "anon"),
    };
  }
  const _exhaustive: never = notification;
  return _exhaustive;
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
  if (isLavorazioniRitardoDigestNotification(notification)) {
    return {
      title: `${notification.count} lavorazioni in ritardo`,
      body: formatLavorazioniRitardoDigestBody(notification),
      href: "/lavorazioni",
      tag: key,
    };
  }
  if (isPreventivoApprovatoNotification(notification)) {
    return {
      title: "Preventivo approvato",
      body: notification.numero?.trim() || notification.cliente?.trim() || "Preventivo approvato",
      href: buildAdminNotificationPreventivoHref(notification.preventivoId),
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
      title: DIPENDENTI_PRESENZE_REMINDER_DESKTOP_TITLE,
      body: formatDipendentiPresenzeReminderDesktopBody(notification.dateYmd),
      href: buildAdminNotificationDipendentiHref(),
      tag: key,
    };
  }
  if (isDashboardPromemoriaReminderNotification(notification)) {
    return {
      title: DASHBOARD_PROMEMORIA_REMINDER_DESKTOP_TITLE,
      body: formatDashboardPromemoriaReminderDesktopBody(
        notification.title,
        notification.description,
        notification.eventTime,
      ),
      href: buildAdminNotificationDashboardHref(),
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

/** Entry point unificato: rispetta flag v2 (off | create-only | on). */
export async function publishNotification(
  userId: string,
  notification: AdminDashboardNotification,
  mode: NotificationsV2Mode,
): Promise<PublishNotificationResult> {
  let added = false;
  let desktop = false;

  if (notificationsV2WritesLegacy(mode)) {
    const key = notificationStoreKey(notification);
    const existed = Boolean(loadAdminNotificationStore(userId).items[key]);
    upsertAdminNotification(userId, notification);
    added = !existed;
    if (added) desktop = dispatchDesktop(notification);
  }

  if (notificationsV2WritesDb(mode)) {
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

  return { added, desktop };
}

/** @deprecated Usare publishNotification con mode. Mantenuto per compat interna. */
export async function publishAdminDashboardNotification(
  userId: string,
  notification: AdminDashboardNotification,
): Promise<PublishNotificationResult> {
  return publishNotification(userId, notification, resolveNotificationsV2Mode(null));
}
