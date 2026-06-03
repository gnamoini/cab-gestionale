import type { NotificationIntent } from "@/lib/lavorazioni/lavorazione-created-notification-mapper";

export type LavorazioneCreatedNotification = NotificationIntent & {
  kind: "lavorazione_created";
};

export type MagazzinoSottoScortaNotification = {
  kind: "magazzino_sotto_scorta";
  id: string;
  ricambioId: string;
  marca: string;
  descrizione: string;
  scorta: number;
  scortaMinima: number;
  createdAt: string;
};

export type DipendentiPresenzeReminderNotification = {
  kind: "dipendenti_presenze_reminder";
  id: string;
  dateYmd: string;
  createdAt: string;
};

/** Solo per verifica campanella + desktop (pulsante test). */
export type AdminDashboardTestNotification = {
  kind: "admin_dashboard_test";
  id: string;
  message: string;
  createdAt: string;
};

export type DashboardPromemoriaReminderNotification = {
  kind: "dashboard_promemoria_reminder";
  id: string;
  promemoriaId: string;
  eventDateYmd: string;
  eventTime?: string | null;
  title: string;
  message: string;
  description?: string | null;
  createdAt: string;
};

export type AdminDashboardNotification =
  | LavorazioneCreatedNotification
  | MagazzinoSottoScortaNotification
  | DipendentiPresenzeReminderNotification
  | DashboardPromemoriaReminderNotification
  | AdminDashboardTestNotification;

export function wrapLavorazioneNotification(intent: NotificationIntent): LavorazioneCreatedNotification {
  return { kind: "lavorazione_created", ...intent };
}

export function notificationStoreKey(notification: AdminDashboardNotification): string {
  if (notification.kind === "lavorazione_created") return `lav:${notification.lavorazioneId}`;
  if (notification.kind === "dipendenti_presenze_reminder") return notification.id;
  if (notification.kind === "dashboard_promemoria_reminder") return notification.id;
  if (notification.kind === "admin_dashboard_test") return notification.id;
  return `mag:${notification.ricambioId}`;
}

export function notificationCreatedAt(notification: AdminDashboardNotification): string {
  return notification.createdAt;
}

export function isMagazzinoDashboardNotification(
  notification: AdminDashboardNotification,
): notification is MagazzinoSottoScortaNotification {
  return notification.kind === "magazzino_sotto_scorta";
}

export function isLavorazioneDashboardNotification(
  notification: AdminDashboardNotification,
): notification is LavorazioneCreatedNotification {
  return notification.kind === "lavorazione_created";
}

export function isDipendentiPresenzeReminderNotification(
  notification: AdminDashboardNotification,
): notification is DipendentiPresenzeReminderNotification {
  return notification.kind === "dipendenti_presenze_reminder";
}

export function isAdminDashboardTestNotification(
  notification: AdminDashboardNotification,
): notification is AdminDashboardTestNotification {
  return notification.kind === "admin_dashboard_test";
}

export function isDashboardPromemoriaReminderNotification(
  notification: AdminDashboardNotification,
): notification is DashboardPromemoriaReminderNotification {
  return notification.kind === "dashboard_promemoria_reminder";
}

export function buildAdminDashboardTestNotification(
  message = "Notifica di test — campanella e desktop collegati correttamente.",
): AdminDashboardTestNotification {
  return {
    kind: "admin_dashboard_test",
    id: `admin-test:${Date.now()}`,
    message,
    createdAt: new Date().toISOString(),
  };
}
