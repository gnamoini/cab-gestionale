import { CLIENTE_HOME_PATH, hasPermission } from "@/lib/auth/rbac";

/** Persistenza in `app_settings` (module lavorazioni, key client_portal_access). */
export const CLIENT_LAVORAZIONI_SETTINGS_MODULE = "lavorazioni";
export const CLIENT_LAVORAZIONI_SETTINGS_KEY = "client_portal_access";

export type ClientPortalAccessSettings = {
  enabledUserIds: string[];
};

export function parseClientPortalAccess(value: unknown): ClientPortalAccessSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { enabledUserIds: [] };
  }
  const raw = (value as Record<string, unknown>).enabledUserIds;
  const enabledUserIds = Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  return { enabledUserIds };
}

export function userHasClientLavorazioniAccess(
  role: string | null | undefined,
  userId: string | null | undefined,
  settings: ClientPortalAccessSettings,
): boolean {
  if (hasPermission(role, "viewClientLavorazioni")) return true;
  if (!userId?.trim()) return false;
  return settings.enabledUserIds.includes(userId);
}

export function clientLavorazioniListPath(): string {
  return CLIENTE_HOME_PATH;
}

export function clientLavorazioniDetailPath(lavorazioneId: string): string {
  return `${CLIENTE_HOME_PATH}/${encodeURIComponent(lavorazioneId.trim())}`;
}

export function clientLavorazioniPublicUrl(lavorazioneId: string, origin?: string): string {
  const base = (origin ?? (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return `${base}${clientLavorazioniDetailPath(lavorazioneId)}`;
}
