import type { NotificationIntent } from "@/lib/lavorazioni/lavorazione-created-notification-mapper";

export type LavorazioneCreatedNotification = NotificationIntent & {
  kind: "lavorazione_created";
};

export type LavorazioneCompletataNotification = NotificationIntent & {
  kind: "lavorazione_completata";
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
  count: number;
  createdAt: string;
};

/** Solo per verifica campanella + desktop (pulsante test). */
export type AdminDashboardTestNotification = {
  kind: "admin_dashboard_test";
  id: string;
  message: string;
  createdAt: string;
};

export type TagliandoDaEseguireNotification = {
  kind: "tagliando_da_eseguire";
  id: string;
  lavorazioneId: string;
  mezzoId: string;
  attrezzaturaLabel: string;
  cliente: string;
  currentOre: number;
  earliestOverdueOre: number;
  overdueCount: number;
  createdAt: string;
};

export type DashboardPromemoriaReminderNotification = {
  kind: "dashboard_promemoria_reminder";
  id: string;
  promemoriaId: string;
  eventDateYmd: string;
  eventTime: string | null;
  title: string;
  message: string;
  description: string | null;
  createdAt: string;
};

export type AdminDashboardNotification =
  | LavorazioneCreatedNotification
  | LavorazioneCompletataNotification
  | MagazzinoSottoScortaNotification
  | FattureScaduteDigestNotification
  | DipendentiPresenzeReminderNotification
  | TagliandoDaEseguireNotification
  | AdminDashboardTestNotification;

export function wrapLavorazioneNotification(intent: NotificationIntent): LavorazioneCreatedNotification {
  return { kind: "lavorazione_created", ...intent };
}

export function wrapLavorazioneCompletataNotification(
  intent: NotificationIntent,
): LavorazioneCompletataNotification {
  return { kind: "lavorazione_completata", ...intent };
}

export function notificationStoreKey(notification: AdminDashboardNotification): string {
  if (notification.kind === "lavorazione_created") return `lav:${notification.lavorazioneId}`;
  if (notification.kind === "lavorazione_completata") return `lav:${notification.lavorazioneId}:done`;
  if (notification.kind === "fatture_scadute_digest") return notification.id;
  if (notification.kind === "dipendenti_presenze_reminder") return notification.id;
  if (notification.kind === "tagliando_da_eseguire") return notification.id;
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

export function isTagliandoDaEseguireNotification(
  notification: AdminDashboardNotification,
): notification is TagliandoDaEseguireNotification {
  return notification.kind === "tagliando_da_eseguire";
}

export function wrapTagliandoDaEseguireNotification(input: {
  lavorazioneId: string;
  mezzoId: string;
  attrezzaturaLabel: string;
  cliente: string;
  currentOre: number;
  earliestOverdueOre: number;
  overdueCount: number;
  createdAt?: string;
}): TagliandoDaEseguireNotification {
  const createdAt = input.createdAt?.trim() || new Date().toISOString();
  return {
    kind: "tagliando_da_eseguire",
    id: `tagliando-due:${input.lavorazioneId}`,
    lavorazioneId: input.lavorazioneId,
    mezzoId: input.mezzoId,
    attrezzaturaLabel: input.attrezzaturaLabel,
    cliente: input.cliente,
    currentOre: input.currentOre,
    earliestOverdueOre: input.earliestOverdueOre,
    overdueCount: input.overdueCount,
    createdAt,
  };
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
