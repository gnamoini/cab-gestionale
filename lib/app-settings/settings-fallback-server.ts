import "server-only";

import { resolveCabAppSettingsFromRows } from "@/src/lib/app-settings/resolve-from-rows";

/** Defaults impostazioni su server (no runtime cache client). */
export function resolveCabAppSettingsFallbackServer() {
  return resolveCabAppSettingsFromRows([], null);
}
