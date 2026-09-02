import { Q_FOCUS_LAV_ROW, Q_FOCUS_RICAMBIO, buildMagazzinoOpenRicambioHref } from "@/lib/navigation/dashboard-log-links";
import {
  formatMagazzinoSottoScortaNotificationBody,
  MAGAZZINO_SOTTO_SCORTA_NOTIFICATION_TITLE,
} from "@/lib/magazzino/magazzino-sotto-scorta-notification-copy";
import type { NotificationIntent } from "@/lib/lavorazioni/lavorazione-created-notification-mapper";
import {
  getUnreadCount,
  isNotificationUnread,
  type AdminNotificationStoreState,
} from "@/lib/lavorazioni/admin-notification-store";
import type {
  AdminDashboardNotification,
  MagazzinoSottoScortaNotification,
} from "@/lib/notifications/admin-dashboard-notifications";

export function isUnreadAdminNotification(
  state: AdminNotificationStoreState,
  notification: AdminDashboardNotification,
): boolean {
  return isNotificationUnread(state, notification);
}

export function countUnreadAdminNotifications(state: AdminNotificationStoreState): number {
  return getUnreadCount(state);
}

export function adminNotificationBadgeLabel(count: number): string | null {
  if (count <= 0) return null;
  if (count > 99) return "99+";
  return String(count);
}

export function buildAdminNotificationLavorazioneHref(lavorazioneId: string): string {
  const sp = new URLSearchParams();
  sp.set(Q_FOCUS_LAV_ROW, lavorazioneId);
  return `/lavorazioni?${sp.toString()}`;
}

export function isLavorazioniNotificationsPath(pathname: string): boolean {
  return pathname === "/lavorazioni" || pathname.startsWith("/lavorazioni/");
}

export function isPreventiviNotificationsPath(pathname: string): boolean {
  return pathname === "/preventivi" || pathname.startsWith("/preventivi/");
}

export function isFatturazioneNotificationsPath(pathname: string): boolean {
  return pathname === "/fatturazione" || pathname.startsWith("/fatturazione/");
}

export function isMagazzinoNotificationsPath(pathname: string): boolean {
  return pathname === "/magazzino" || pathname.startsWith("/magazzino/");
}

export function isDipendentiNotificationsPath(pathname: string): boolean {
  return pathname === "/dipendenti" || pathname.startsWith("/dipendenti/");
}

export function buildAdminNotificationDipendentiHref(): string {
  return "/dipendenti";
}

export function buildAdminNotificationDashboardHref(): string {
  return "/dashboard";
}

export function isDashboardNotificationsPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

/** Desktop: solo fuori dashboard e lavorazioni. */
export function shouldShowDesktopLavorazioneNotification(pathname: string): boolean {
  return (
    !isDashboardNotificationsPath(pathname) &&
    !isLavorazioniNotificationsPath(pathname) &&
    !isDipendentiNotificationsPath(pathname)
  );
}

/** Toast + document.title: pagine diverse da dashboard e lavorazioni. */
export function shouldShowLightLavorazioneAlert(pathname: string): boolean {
  return shouldShowDesktopLavorazioneNotification(pathname);
}

export function formatAdminNotificationToastMessage(
  intent: Pick<NotificationIntent, "cliente" | "mezzo" | "targa">,
): string {
  const parts = [intent.cliente?.trim(), intent.mezzo?.trim(), intent.targa?.trim()].filter(Boolean);
  return parts.length > 0 ? `Nuova lavorazione: ${parts.join(" · ")}` : "Nuova lavorazione";
}

export function formatAdminNotificationDesktopBody(
  intent: Pick<NotificationIntent, "cliente" | "mezzo" | "targa">,
): string {
  const lines = [intent.cliente?.trim(), intent.mezzo?.trim(), intent.targa?.trim()].filter(Boolean);
  return lines.join("\n") || "Nuova lavorazione registrata";
}

export function adminNotificationDedupKey(lavorazioneId: string): string {
  return `admin-lav-notif:${lavorazioneId}`;
}

export function adminMagazzinoNotificationDedupKey(ricambioId: string): string {
  return `admin-mag-notif:${ricambioId}`;
}

export function buildAdminNotificationPreventivoHref(preventivoId: string): string {
  return `/preventivi?focus=${encodeURIComponent(preventivoId)}`;
}

export function buildAdminNotificationFatturazioneHref(): string {
  return "/fatturazione?scadenzaPreset=scadute";
}

export function buildAdminNotificationMagazzinoHref(ricambioId: string): string {
  const sp = new URLSearchParams();
  sp.set(Q_FOCUS_RICAMBIO, ricambioId);
  return `/magazzino?${sp.toString()}`;
}

/** Deep link inbox/push: apre modale dettaglio ricambio. */
export function buildAdminNotificationOpenMagazzinoHref(ricambioId: string): string {
  return buildMagazzinoOpenRicambioHref(ricambioId, "dashboard");
}

export function formatMagazzinoSottoScortaToastMessage(
  notification: Pick<
    MagazzinoSottoScortaNotification,
    "descrizione" | "codice" | "scorta" | "scortaMinima"
  >,
): string {
  return formatMagazzinoSottoScortaNotificationBody({
    nome: notification.descrizione,
    codice: notification.codice,
    quantita: notification.scorta,
    scortaMinima: notification.scortaMinima,
  });
}

export { MAGAZZINO_SOTTO_SCORTA_NOTIFICATION_TITLE };

export function formatLavorazioneCompletataToastMessage(
  intent: Pick<NotificationIntent, "cliente" | "mezzo" | "titolo">,
): string {
  const parts = [intent.cliente?.trim(), intent.mezzo?.trim()].filter(Boolean);
  const code = intent.titolo?.trim();
  if (parts.length > 0) return `Lavorazione completata: ${parts.join(" · ")}`;
  return code ? `Lavorazione completata: ${code}` : "Lavorazione completata";
}

export function formatPreventivoApprovatoToastMessage(input: {
  numero: string;
  cliente: string;
}): string {
  const parts = [input.numero?.trim(), input.cliente?.trim()].filter(Boolean);
  return parts.length > 0 ? `Preventivo approvato: ${parts.join(" · ")}` : "Preventivo approvato";
}
