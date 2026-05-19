"use client";

import { getRuntimeCabAppSettings } from "@/src/lib/app-settings/runtime-settings-cache";
import { resolveCabAppSettingsFromRows } from "@/src/lib/app-settings/resolve-from-rows";

/** Fallback impostazioni quando la query è in loading o errore (runtime cache → defaults). */
export function resolveCabAppSettingsFallback() {
  return getRuntimeCabAppSettings() ?? resolveCabAppSettingsFromRows([], null);
}
