import { shouldNotifyRemoteChange } from "@/lib/sistema/remote-change-notify";
import {
  OPERATOR_GLOBAL_SETTINGS_KEY,
  OPERATOR_GLOBAL_SETTINGS_MODULE,
} from "@/lib/permissions/operator-global-settings";
import type { PostgresChangePayload } from "@/lib/realtime/postgres-changes-channel";
import type { AppSettingRow } from "@/src/types/supabase-tables";

export const REMOTE_SETTINGS_NOTIFY_DEBOUNCE_MS = 1200;
export const REMOTE_SETTINGS_NOTIFY_COOLDOWN_MS = 10_000;

export function appSettingsChangeFingerprint(payload: PostgresChangePayload): string {
  const n = payload.new as Partial<AppSettingRow> | undefined;
  const o = payload.old as Partial<AppSettingRow> | undefined;
  if (payload.eventType === "DELETE") {
    return `DELETE:${o?.id ?? ""}:${o?.updated_at ?? ""}`;
  }
  return `${payload.eventType}:${n?.id ?? ""}:${n?.updated_at ?? ""}:${n?.updated_by ?? ""}`;
}

export function isOwnAppSettingsWrite(userId: string | undefined, payload: PostgresChangePayload): boolean {
  if (!userId) return false;
  if (payload.eventType === "DELETE") {
    const o = payload.old as Partial<AppSettingRow> | undefined;
    return o?.updated_by === userId;
  }
  const n = payload.new as Partial<AppSettingRow> | undefined;
  return n?.updated_by === userId;
}

export function shouldShowRemoteSettingsToast(): boolean {
  return shouldNotifyRemoteChange("settings-remote-toast", REMOTE_SETTINGS_NOTIFY_COOLDOWN_MS);
}

/** True se il payload postgres_changes tocca il flag pilot operatore (refresh operational mirato). */
export function isOperatorGlobalSettingsPilotPayload(payload: PostgresChangePayload): boolean {
  const row =
    payload.eventType === "DELETE"
      ? (payload.old as Partial<AppSettingRow> | undefined)
      : (payload.new as Partial<AppSettingRow> | undefined);
  return row?.module === OPERATOR_GLOBAL_SETTINGS_MODULE && row?.key === OPERATOR_GLOBAL_SETTINGS_KEY;
}
