import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";
import type { PostgresChangePayload } from "@/lib/realtime/postgres-changes-channel";
import type { AppSettingRow } from "@/src/types/supabase-tables";

export function isMezziListeSettingsPayload(payload: PostgresChangePayload): boolean {
  const row = (payload.new ?? payload.old) as Partial<AppSettingRow> | undefined;
  return row?.module === CAB_SETTINGS_MODULE.mezzi && row?.key === CAB_SETTINGS_KEY.liste;
}

/** Remote liste change: settings cache only unless propagation already completed elsewhere. */
export function remoteAppSettingsInvalidationTables(): string[] {
  return ["app_settings"];
}

export function remoteSettingsNotifyMessage(hasPendingPropagation: boolean): string {
  if (hasPendingPropagation) {
    return "Impostazioni aggiornate — propagazione dati live ancora pendente su un altro client";
  }
  return "Impostazioni aggiornate da un altro utente";
}
