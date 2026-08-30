/**
 * Flag migrazione inbox notifiche v2.
 * SSOT DB: app_settings module system, key notifications_v2_mode.
 * Override env: NEXT_PUBLIC_NOTIFICATIONS_V2=off|create-only|on
 */

export type NotificationsV2Mode = "off" | "create-only" | "on";

export const NOTIFICATIONS_V2_MODULE = "system" as const;
export const NOTIFICATIONS_V2_KEY = "notifications_v2_mode" as const;

const VALID_MODES: NotificationsV2Mode[] = ["off", "create-only", "on"];

export function parseNotificationsV2Mode(value: unknown): NotificationsV2Mode | null {
  if (typeof value !== "string") return null;
  const t = value.trim() as NotificationsV2Mode;
  return VALID_MODES.includes(t) ? t : null;
}

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

export function readNotificationsV2ModeFromRows(rows: AppSettingsRowLike[] | undefined): NotificationsV2Mode | null {
  if (!rows?.length) return null;
  const row = rows.find((r) => r.module === NOTIFICATIONS_V2_MODULE && r.key === NOTIFICATIONS_V2_KEY);
  if (!row) return null;
  if (typeof row.value === "string") return parseNotificationsV2Mode(row.value);
  if (row.value != null && typeof row.value === "object" && "mode" in row.value) {
    return parseNotificationsV2Mode((row.value as { mode?: unknown }).mode);
  }
  return null;
}

export function resolveNotificationsV2Mode(dbMode: NotificationsV2Mode | null | undefined): NotificationsV2Mode {
  const env = process.env.NEXT_PUBLIC_NOTIFICATIONS_V2?.trim();
  if (env === "off" || env === "create-only" || env === "on") return env;
  if (dbMode) return dbMode;
  return "on";
}

export function notificationsV2ReadsDb(mode: NotificationsV2Mode): boolean {
  void mode;
  return true;
}

export function notificationsV2WritesLegacy(_mode: NotificationsV2Mode): boolean {
  void _mode;
  return false;
}

export function notificationsV2WritesDb(mode: NotificationsV2Mode): boolean {
  return mode === "on" || mode === "create-only";
}
