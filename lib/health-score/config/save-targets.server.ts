import "server-only";

import { APP_SETTINGS_COLUMNS } from "@/lib/db/table-select-columns";
import { invalidateHealthScoreHistoryCache } from "@/lib/health-score/cache/history-cache.server";
import { invalidateHealthScoreResultCache } from "@/lib/health-score/cache/result-cache.server";
import { HEALTH_SCORE_V2_DEFAULTS } from "@/lib/health-score/config/defaults";
import {
  HEALTH_SCORE_CONFIG_KEY,
  HEALTH_SCORE_CONFIG_MODULE,
  resolveHealthScoreConfigServer,
} from "@/lib/health-score/config/resolve-config.server";
import { healthScoreConfigSchema } from "@/lib/health-score/config/schema";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

const ALLOWED_TARGET_KEYS = new Set(Object.keys(HEALTH_SCORE_V2_DEFAULTS.targets));

export function sanitizeHealthScoreTargetPatches(
  input: Record<string, unknown>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, val] of Object.entries(input)) {
    if (!ALLOWED_TARGET_KEYS.has(key)) continue;
    const n = typeof val === "number" ? val : Number(val);
    if (!Number.isFinite(n) || n < 0) continue;
    out[key] = n;
  }
  return out;
}

export async function updateHealthScoreTargetsServer(
  targetPatches: Record<string, number>,
): Promise<Record<string, number>> {
  const patches = sanitizeHealthScoreTargetPatches(targetPatches);
  if (Object.keys(patches).length === 0) {
    throw new Error("Nessun target valido da aggiornare");
  }

  const current = await resolveHealthScoreConfigServer();
  const nextConfig = healthScoreConfigSchema.parse({
    ...current,
    targets: { ...current.targets, ...patches },
  });

  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.from("app_settings").upsert(
    {
      module: HEALTH_SCORE_CONFIG_MODULE,
      key: HEALTH_SCORE_CONFIG_KEY,
      value: nextConfig,
    },
    { onConflict: "module,key" },
  );
  if (error) throw new Error(error.message);

  invalidateHealthScoreResultCache();
  invalidateHealthScoreHistoryCache();

  return nextConfig.targets;
}

export async function readHealthScoreTargetsServer(): Promise<Record<string, number>> {
  const config = await resolveHealthScoreConfigServer();
  return { ...HEALTH_SCORE_V2_DEFAULTS.targets, ...config.targets };
}

export async function readHealthScoreConfigRowUpdatedAtServer(): Promise<string | null> {
  const sb = await createSupabaseServerUserClient();
  const { data } = await sb
    .from("app_settings")
    .select(APP_SETTINGS_COLUMNS)
    .eq("module", HEALTH_SCORE_CONFIG_MODULE)
    .eq("key", HEALTH_SCORE_CONFIG_KEY)
    .maybeSingle();
  return data?.updated_at ?? null;
}
