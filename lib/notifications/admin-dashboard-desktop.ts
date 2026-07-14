"use client";

import {
  buildAdminNotificationDipendentiHref,
  buildAdminNotificationFatturazioneHref,
  buildAdminNotificationLavorazioneHref,
  buildAdminNotificationMagazzinoHref,
  formatAdminNotificationDesktopBody,
  formatLavorazioneCompletataToastMessage,
  formatMagazzinoSottoScortaToastMessage,
} from "@/lib/lavorazioni/admin-notifications";
import {
  getDesktopNotificationPermissionState,
  showDesktopAdminNotification,
} from "@/lib/lavorazioni/desktop-notifications";
import {
  formatDipendentiPresenzeReminderDesktopBody,
  formatDipendentiPresenzeReminderTitle,
} from "@/lib/dipendenti/dipendenti-presenze-reminder";
import { formatFattureScaduteDigestBody } from "@/lib/fatturazione/fatture-scadute-digest";
import { formatTagliandoDaEseguireBody } from "@/lib/maintenance-plans/tagliando-due-notification-mapper";
import {
  isAdminDashboardTestNotification,
  isDipendentiPresenzeReminderNotification,
  isFattureScaduteDigestNotification,
  isLavorazioneCompletataNotification,
  isLavorazioneDashboardNotification,
  isMagazzinoDashboardNotification,
  isTagliandoDaEseguireNotification,
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
      title: formatDipendentiPresenzeReminderTitle(notification.count),
      body: formatDipendentiPresenzeReminderDesktopBody(notification),
      href: buildAdminNotificationDipendentiHref(),
      tag: notificationStoreKey(notification),
    };
  }
  if (isTagliandoDaEseguireNotification(notification)) {
    return {
      title: "Tagliando da eseguire",
      body: formatTagliandoDaEseguireBody(notification),
      href: "/mezzi",
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
