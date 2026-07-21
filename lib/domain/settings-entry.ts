"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import {
  settingsService,
  SETTINGS_CONCURRENCY_CONFLICT,
  applyAppSettingsUpsert,
  mergeAppSettingsUpsertWithVersions,
  type AppSettingsUpsertInput,
} from "@/src/services/settings.service";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";
import { err, type ServiceResult } from "@/src/services/service-result";
import type { AppSettingRow } from "@/src/types/supabase-tables";

const MAGAZZINO_SCOPED_KEYS = new Set<string>([CAB_SETTINGS_KEY.master, CAB_SETTINGS_KEY.stockPolicy]);

function assertMagazzinoScopedSetting(input: AppSettingsUpsertInput): string | null {
  if (input.module !== CAB_SETTINGS_MODULE.magazzino) return "Impostazione non valida per magazzino.";
  if (!MAGAZZINO_SCOPED_KEYS.has(input.key)) return "Chiave impostazione magazzino non consentita.";
  return null;
}

async function upsertMagazzinoScopedSetting(input: AppSettingsUpsertInput): Promise<ServiceResult<AppSettingRow>> {
  const guardMsg = assertMagazzinoScopedSetting(input);
  if (guardMsg) return err(guardMsg);
  return settingsService.upsertSetting(input);
}

export const settingsEntry = {
  getAllSettings: settingsService.getAllSettings.bind(settingsService),
  getModuleSettings: settingsService.getModuleSettings.bind(settingsService),
  getSetting: settingsService.getSetting.bind(settingsService),
  upsertSetting: withPageWriteGuard("impostazioni", settingsService.upsertSetting.bind(settingsService)),
  upsertMagazzinoSetting: withPageWriteGuard("magazzino", upsertMagazzinoScopedSetting),
  bulkUpsertSettings: withPageWriteGuard("impostazioni", settingsService.bulkUpsertSettings.bind(settingsService)),
};

export { SETTINGS_CONCURRENCY_CONFLICT, applyAppSettingsUpsert, mergeAppSettingsUpsertWithVersions, type AppSettingsUpsertInput };
