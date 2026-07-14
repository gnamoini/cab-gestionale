import "server-only";

import { cache } from "react";
import { createHash } from "node:crypto";
import { HEALTH_SCORE_V2_DEFAULTS } from "@/lib/health-score/config/defaults";
import { healthScoreConfigSchema, type HealthScoreConfig } from "@/lib/health-score/config/schema";
import { fetchCabAppSettingsPayloadServer } from "@/lib/app-settings/resolve-settings-for-server";

const CONFIG_MODULE = "health_score";
const CONFIG_KEY = "v2_config";

export const resolveHealthScoreConfigServer = cache(async (): Promise<HealthScoreConfig> => {
  try {
    const payload = await fetchCabAppSettingsPayloadServer();
    const row = payload.rows.find((r) => r.module === CONFIG_MODULE && r.key === CONFIG_KEY);
    if (!row?.value || typeof row.value !== "object") {
      return HEALTH_SCORE_V2_DEFAULTS;
    }
    const parsed = healthScoreConfigSchema.safeParse(row.value);
    if (!parsed.success) return HEALTH_SCORE_V2_DEFAULTS;
    return { ...HEALTH_SCORE_V2_DEFAULTS, ...parsed.data };
  } catch {
    return HEALTH_SCORE_V2_DEFAULTS;
  }
});

export function hashHealthScoreConfig(config: HealthScoreConfig): string {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex").slice(0, 16);
}
