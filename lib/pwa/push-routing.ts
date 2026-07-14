import {
  buildAdminNotificationDipendentiHref,
  buildAdminNotificationFatturazioneHref,
  buildAdminNotificationLavorazioneHref,
  buildAdminNotificationMagazzinoHref,
} from "@/lib/lavorazioni/admin-notifications";

const ALLOWED_PREFIXES = [
  "/dashboard",
  "/lavorazioni",
  "/lavorazioni-clienti",
  "/magazzino",
  "/agenda",
  "/report",
  "/mezzi",
  "/documenti",
  "/dipendenti",
  "/fatturazione",
  "/preventivi",
  "/impostazioni",
  "/sicurezza",
  "/offline",
  "/login",
] as const;

export const PWA_PUSH_OPEN_MESSAGE_TYPE = "PWA_PUSH_OPEN" as const;

export const PWA_PUSH_NOTIFICATION_ID_PARAM = "pwaNotificationId" as const;

export type PwaPushOpenMessage = {
  type: typeof PWA_PUSH_OPEN_MESSAGE_TYPE;
  notificationId?: string;
  href: string;
};

/** Allinea href push a inboxNotificationHref — pure, no React. */
export function resolvePushHrefFromNotification(input: {
  type: string;
  href?: string | null;
  entity_id?: string | null;
}): string {
  const type = input.type;
  const entityId = input.entity_id?.trim() || null;

  if (type === "lavorazione_created" || type === "lavorazione_completata") {
    return entityId ? buildAdminNotificationLavorazioneHref(entityId) : "/lavorazioni";
  }
  if (type === "client_portal_ingresso" || type === "client_portal_completata") {
    return entityId ? `/lavorazioni-clienti/${encodeURIComponent(entityId)}` : "/lavorazioni-clienti";
  }
  if (type === "magazzino_sotto_scorta") {
    return entityId ? buildAdminNotificationMagazzinoHref(entityId) : "/magazzino";
  }
  if (type === "fatture_scadute_digest") return buildAdminNotificationFatturazioneHref();
  if (type === "dipendenti_presenze_reminder") return buildAdminNotificationDipendentiHref();
  if (type === "tagliando_da_eseguire") return "/mezzi";

  const stored = input.href?.trim();
  if (stored) return stored.startsWith("/") ? stored : `/${stored}`;
  return "/dashboard";
}

/** Normalizza href notifica per apertura da SW notificationclick. */
export function resolvePushNotificationUrl(href: string | null | undefined): string {
  const raw = href?.trim();
  if (!raw) return "/dashboard";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      if (typeof location !== "undefined" && url.origin === location.origin) {
        return resolvePushNotificationUrl(url.pathname + url.search + url.hash);
      }
    } catch {
      return "/dashboard";
    }
    return "/dashboard";
  }
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const pathOnly = path.split("?")[0]?.split("#")[0] ?? path;
  const ok = ALLOWED_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`),
  );
  return ok ? path : "/dashboard";
}

export function appendPushNotificationIdToHref(href: string, notificationId?: string): string {
  const resolved = resolvePushNotificationUrl(href);
  if (!notificationId?.trim()) return resolved;
  const url = new URL(resolved, "http://local.invalid");
  url.searchParams.set(PWA_PUSH_NOTIFICATION_ID_PARAM, notificationId.trim());
  return `${url.pathname}${url.search}${url.hash}`;
}

export function parsePushNotificationIdFromLocation(search: string): string | null {
  try {
    const id = new URLSearchParams(search).get(PWA_PUSH_NOTIFICATION_ID_PARAM);
    return id?.trim() || null;
  } catch {
    return null;
  }
}

export function stripPushNotificationIdFromHref(href: string): string {
  try {
    const url = new URL(href, "http://local.invalid");
    url.searchParams.delete(PWA_PUSH_NOTIFICATION_ID_PARAM);
    const qs = url.searchParams.toString();
    return `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`;
  } catch {
    return href;
  }
}
