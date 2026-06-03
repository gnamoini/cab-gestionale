import { Q_FOCUS_LAV_ROW, Q_FOCUS_RICAMBIO } from "@/lib/navigation/dashboard-log-links";
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

export function buildAdminNotificationMagazzinoHref(ricambioId: string): string {
  const sp = new URLSearchParams();
  sp.set(Q_FOCUS_RICAMBIO, ricambioId);
  return `/magazzino?${sp.toString()}`;
}

export function formatMagazzinoSottoScortaToastMessage(
  notification: Pick<MagazzinoSottoScortaNotification, "marca" | "descrizione" | "scorta" | "scortaMinima">,
): string {
  const label = [notification.marca?.trim(), notification.descrizione?.trim()].filter(Boolean).join(" · ");
  const qty = `${notification.scorta}/${notification.scortaMinima}`;
  return label ? `Sotto scorta: ${label} (${qty})` : `Sotto scorta minima (${qty})`;
}
