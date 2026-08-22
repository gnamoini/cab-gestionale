import "server-only";

import { fetchCabAppSettingsPayloadServer } from "@/lib/app-settings/resolve-settings-for-server";

export async function resolveCostoOrarioDefaultServer(): Promise<number> {
  const payload = await fetchCabAppSettingsPayloadServer();
  const v = payload.resolved?.preventiviDefaults?.costoOrarioDefault;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 48;
}
