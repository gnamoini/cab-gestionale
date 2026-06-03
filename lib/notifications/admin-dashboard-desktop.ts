"use client";

import {
  loadAdminNotificationStore,
  upsertAdminNotification,
} from "@/lib/lavorazioni/admin-notification-store";
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
  requestDesktopNotificationPermissionOnce,
  showDesktopAdminNotification,
} from "@/lib/lavorazioni/desktop-notifications";
import {
  DIPENDENTI_PRESENZE_REMINDER_DESKTOP_TITLE,
  formatDipendentiPresenzeReminderDesktopBody,
} from "@/lib/dipendenti/dipendenti-presenze-reminder";
import {
  isAdminDashboardTestNotification,
  isDashboardPromemoriaReminderNotification,
  isDipendentiPresenzeReminderNotification,
  isLavorazioneDashboardNotification,
  isMagazzinoDashboardNotification,
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
export async function dispatchAdminDashboardDesktopNotification(
  notification: AdminDashboardNotification,
): Promise<boolean> {
  const perm = await requestDesktopNotificationPermissionOnce();
  if (perm !== "granted") return false;
  const payload = adminDashboardNotificationDesktopPayload(notification);
  showDesktopAdminNotification(payload);
  return true;
}

/** Inserisce in campanella + invia desktop (unico punto per notifiche admin). */
export async function publishAdminDashboardNotification(
  userId: string,
  notification: AdminDashboardNotification,
): Promise<{ added: boolean; desktop: boolean }> {
  const key = notificationStoreKey(notification);
  const existed = Boolean(loadAdminNotificationStore(userId).items[key]);
  upsertAdminNotification(userId, notification);
  const desktop = await dispatchAdminDashboardDesktopNotification(notification);
  return { added: !existed, desktop };
}
