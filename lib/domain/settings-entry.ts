"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import {
  settingsService,
  SETTINGS_CONCURRENCY_CONFLICT,
  applyAppSettingsUpsert,
  mergeAppSettingsUpsertWithVersions,
  type AppSettingsUpsertInput,
} from "@/src/services/settings.service";

export const settingsEntry = {
  getAllSettings: settingsService.getAllSettings.bind(settingsService),
  getModuleSettings: settingsService.getModuleSettings.bind(settingsService),
  getSetting: settingsService.getSetting.bind(settingsService),
  upsertSetting: withPageWriteGuard("impostazioni", settingsService.upsertSetting.bind(settingsService)),
  bulkUpsertSettings: withPageWriteGuard("impostazioni", settingsService.bulkUpsertSettings.bind(settingsService)),
};

export { SETTINGS_CONCURRENCY_CONFLICT, applyAppSettingsUpsert, mergeAppSettingsUpsertWithVersions, type AppSettingsUpsertInput };
