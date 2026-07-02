import type { NotificationIntent } from "@/lib/lavorazioni/lavorazione-created-notification-mapper";

export type LavorazioneCreatedNotification = NotificationIntent & {
  kind: "lavorazione_created";
};

export type LavorazioneCompletataNotification = NotificationIntent & {
  kind: "lavorazione_completata";
};

export type LavorazioniRitardoDigestNotification = {
  kind: "lavorazioni_ritardo_digest";
  id: string;
  dateYmd: string;
  count: number;
  sogliaGiorni: number;
  createdAt: string;
};

export type PreventivoApprovatoNotification = {
  kind: "preventivo_approvato";
  id: string;
  preventivoId: string;
  numero: string;
  cliente: string;
  totale: number;
  createdAt: string;
};

export type FattureScaduteDigestNotification = {
  kind: "fatture_scadute_digest";
  id: string;
  dateYmd: string;
  count: number;
  createdAt: string;
};

export type MagazzinoSottoScortaNotification = {
  kind: "magazzino_sotto_scorta";
  id: string;
  ricambioId: string;
  marca: string;
  descrizione: string;
  scorta: number;
  scortaMinima: number;
  /** true quando scorta = 0 (esaurimento). */
  esaurito?: boolean;
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
  | LavorazioneCompletataNotification
  | LavorazioniRitardoDigestNotification
  | PreventivoApprovatoNotification
  | MagazzinoSottoScortaNotification
  | FattureScaduteDigestNotification
  | DipendentiPresenzeReminderNotification
  | DashboardPromemoriaReminderNotification
  | AdminDashboardTestNotification;

export function wrapLavorazioneNotification(intent: NotificationIntent): LavorazioneCreatedNotification {
  return { kind: "lavorazione_created", ...intent };
}

export function wrapLavorazioneCompletataNotification(
  intent: NotificationIntent,
): LavorazioneCompletataNotification {
  return { kind: "lavorazione_completata", ...intent };
}

export function wrapPreventivoApprovatoNotification(input: {
  preventivoId: string;
  numero: string;
  cliente: string;
  totale: number;
  createdAt: string;
}): PreventivoApprovatoNotification {
  return {
    kind: "preventivo_approvato",
    id: `prev:${input.preventivoId}:approved`,
    preventivoId: input.preventivoId,
    numero: input.numero,
    cliente: input.cliente,
    totale: input.totale,
    createdAt: input.createdAt,
  };
}

export function notificationStoreKey(notification: AdminDashboardNotification): string {
  if (notification.kind === "lavorazione_created") return `lav:${notification.lavorazioneId}`;
  if (notification.kind === "lavorazione_completata") return `lav:${notification.lavorazioneId}:done`;
  if (notification.kind === "lavorazioni_ritardo_digest") return notification.id;
  if (notification.kind === "preventivo_approvato") return notification.id;
  if (notification.kind === "fatture_scadute_digest") return notification.id;
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

export function isLavorazioneCompletataNotification(
  notification: AdminDashboardNotification,
): notification is LavorazioneCompletataNotification {
  return notification.kind === "lavorazione_completata";
}

export function isLavorazioniRitardoDigestNotification(
  notification: AdminDashboardNotification,
): notification is LavorazioniRitardoDigestNotification {
  return notification.kind === "lavorazioni_ritardo_digest";
}

export function isPreventivoApprovatoNotification(
  notification: AdminDashboardNotification,
): notification is PreventivoApprovatoNotification {
  return notification.kind === "preventivo_approvato";
}

export function isFattureScaduteDigestNotification(
  notification: AdminDashboardNotification,
): notification is FattureScaduteDigestNotification {
  return notification.kind === "fatture_scadute_digest";
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
