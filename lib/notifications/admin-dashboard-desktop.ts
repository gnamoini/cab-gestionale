"use client";

import {
  formatDashboardPromemoriaReminderDesktopBody,
  DASHBOARD_PROMEMORIA_REMINDER_DESKTOP_TITLE,
} from "@/lib/dashboard/dashboard-promemoria-reminder";
import {
  buildAdminNotificationDashboardHref,
  buildAdminNotificationDipendentiHref,
  buildAdminNotificationLavorazioneHref,
  buildAdminNotificationMagazzinoHref,
  formatAdminNotificationDesktopBody,
  formatMagazzinoSottoScortaToastMessage,
} from "@/lib/lavorazioni/admin-notifications";
import {
  getDesktopNotificationPermissionState,
  showDesktopAdminNotification,
} from "@/lib/lavorazioni/desktop-notifications";
import {
  DIPENDENTI_PRESENZE_REMINDER_DESKTOP_TITLE,
  formatDipendentiPresenzeReminderDesktopBody,
} from "@/lib/dipendenti/dipendenti-presenze-reminder";
import {
  formatLavorazioneCompletataToastMessage,
  formatPreventivoApprovatoToastMessage,
  buildAdminNotificationFatturazioneHref,
  buildAdminNotificationPreventivoHref,
} from "@/lib/lavorazioni/admin-notifications";
import { formatLavorazioniRitardoDigestBody } from "@/lib/lavorazioni/lavorazioni-ritardo-digest";
import { formatFattureScaduteDigestBody } from "@/lib/fatturazione/fatture-scadute-digest";
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

export type AdminDashboardDesktopPayload = {
  title: string;
  body: string;
  href: string;
  tag: string;
};

/** Solo notifiche campanella admin → payload desktop (mai toast operativi altre pagine). */
export function adminDashboardNotificationDesktopPayload(
  notification: AdminDashboardNotification,
): AdminDashboardDesktopPayload {
  if (isLavorazioneDashboardNotification(notification)) {
    return {
      title: "Nuova lavorazione",
      body: formatAdminNotificationDesktopBody(notification),
      href: buildAdminNotificationLavorazioneHref(notification.lavorazioneId),
      tag: notificationStoreKey(notification),
    };
  }
  if (isLavorazioneCompletataNotification(notification)) {
    return {
      title: "Lavorazione completata",
      body: formatLavorazioneCompletataToastMessage(notification),
      href: buildAdminNotificationLavorazioneHref(notification.lavorazioneId),
      tag: notificationStoreKey(notification),
    };
  }
  if (isLavorazioniRitardoDigestNotification(notification)) {
    return {
      title: "Lavorazioni in ritardo",
      body: formatLavorazioniRitardoDigestBody(notification),
      href: "/lavorazioni",
      tag: notificationStoreKey(notification),
    };
  }
  if (isPreventivoApprovatoNotification(notification)) {
    return {
      title: "Preventivo approvato",
      body: formatPreventivoApprovatoToastMessage(notification),
      href: buildAdminNotificationPreventivoHref(notification.preventivoId),
      tag: notificationStoreKey(notification),
    };
  }
  if (isFattureScaduteDigestNotification(notification)) {
    return {
      title: "Fatture scadute",
      body: formatFattureScaduteDigestBody(notification),
      href: buildAdminNotificationFatturazioneHref(),
      tag: notificationStoreKey(notification),
    };
  }
  if (isMagazzinoDashboardNotification(notification)) {
    return {
      title: "Sotto scorta minima",
      body: formatMagazzinoSottoScortaToastMessage(notification),
      href: buildAdminNotificationMagazzinoHref(notification.ricambioId),
      tag: notificationStoreKey(notification),
    };
  }
  if (isDipendentiPresenzeReminderNotification(notification)) {
    return {
      title: DIPENDENTI_PRESENZE_REMINDER_DESKTOP_TITLE,
      body: formatDipendentiPresenzeReminderDesktopBody(notification.dateYmd),
      href: buildAdminNotificationDipendentiHref(),
      tag: notificationStoreKey(notification),
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
      tag: notificationStoreKey(notification),
    };
  }
  if (isAdminDashboardTestNotification(notification)) {
    return {
      title: "Test notifiche",
      body: notification.message,
      href: "/dashboard",
      tag: notificationStoreKey(notification),
    };
  }
  const _exhaustive: never = notification;
  return _exhaustive;
}

/**
 * Mostra notifica desktop per una voce della campanella admin.
 * Non usare per toast/sync di altre pagine (GestionaleNotificationsBridge).
 */
export function dispatchAdminDashboardDesktopNotification(
  notification: AdminDashboardNotification,
): boolean {
  if (getDesktopNotificationPermissionState() !== "granted") return false;
  const payload = adminDashboardNotificationDesktopPayload(notification);
  showDesktopAdminNotification(payload);
  return true;
}

export {
  publishNotification,
  publishAdminDashboardNotification,
  type PublishNotificationResult,
} from "@/lib/notifications/publish-notification";
