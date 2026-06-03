"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensureSectionRead, ensureSectionWrite } from "@/src/lib/auth/permission-guards";
import { applyAppSettingsUpsert } from "@/src/services/settings.service";
import type { MagazzinoManualMonthMap } from "@/lib/report/magazzino-manual-storage";

const SETTINGS_MODULE = "report";
const SETTINGS_KEY = "magazzino_manual_month_map_v1";
const MIGRATION_FLAG = "gestionale-report-mag-manual-db-v1";

export async function loadMagazzinoManualFromDb(): Promise<MagazzinoManualMonthMap | null> {
  const allowed = await ensureSectionRead("report");
  if (!allowed.success) return null;
  const c = await getBrowserSupabase();
  const { data, error } = await c
    .from("app_settings")
    .select("value")
    .eq("module", SETTINGS_MODULE)
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  if (error || !data?.value) return null;
  const v = data.value;
  if (v && typeof v === "object" && !Array.isArray(v)) return v as MagazzinoManualMonthMap;
  return null;
}

export async function saveMagazzinoManualToDb(map: MagazzinoManualMonthMap): Promise<boolean> {
  const allowed = await ensureSectionWrite("report");
  if (!allowed.success) return false;
  const c = await getBrowserSupabase();
  const res = await applyAppSettingsUpsert(c, {
    module: SETTINGS_MODULE,
    key: SETTINGS_KEY,
    value: map as unknown as Record<string, unknown>,
  });
  return res.success;
}

export function markMagazzinoManualDbMigrated(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MIGRATION_FLAG, "1");
    window.localStorage.removeItem("gestionale-report-magazzino-manual-v1");
  } catch {
    /* ignore */
  }
}

export function isMagazzinoManualDbMigrated(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(MIGRATION_FLAG) === "1";
  } catch {
    return true;
  }
}

export async function migrateMagazzinoManualLocalToDb(
  localMap: MagazzinoManualMonthMap,
): Promise<MagazzinoManualMonthMap> {
  if (isMagazzinoManualDbMigrated()) {
    const db = await loadMagazzinoManualFromDb();
    return db ?? localMap;
  }
  const db = await loadMagazzinoManualFromDb();
  const merged = { ...(db ?? {}), ...localMap };
  if (Object.keys(merged).length > 0) {
    await saveMagazzinoManualToDb(merged);
  }
  markMagazzinoManualDbMigrated();
  return merged;
}
