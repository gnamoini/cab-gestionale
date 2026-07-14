import type { WorkshopSize } from "@/lib/health-score/types";
import type { HealthScoreConfig } from "@/lib/health-score/config/schema";
import { HEALTH_SCORE_V2_DEFAULTS } from "@/lib/health-score/config/defaults";

/** ponytail: size overrides sono tabella statica; upgrade path = app_settings per size. */
const SIZE_TARGET_MULTIPLIERS: Record<WorkshopSize, Partial<Record<string, number>>> = {
  micro: { close_time_days: 1.4, backlog: 1.5, completate_periodo: 0.5 },
  piccola: { close_time_days: 1.2, backlog: 1.2, completate_periodo: 0.7 },
  media: { close_time_days: 1, backlog: 1, completate_periodo: 1 },
  grande: { close_time_days: 0.85, backlog: 0.9, completate_periodo: 1.2 },
  enterprise: { close_time_days: 0.7, backlog: 0.8, completate_periodo: 1.5 },
};

export type TargetContext = {
  workshopSize: WorkshopSize;
  config: HealthScoreConfig;
};

export function resolveTarget(targetKey: string, ctx: TargetContext): number {
  const settingsOverride = ctx.config.targets[targetKey];
  const globalDefault = HEALTH_SCORE_V2_DEFAULTS.targets[targetKey];
  const base = settingsOverride ?? globalDefault ?? 0;
  const mult = SIZE_TARGET_MULTIPLIERS[ctx.workshopSize][targetKey] ?? 1;
  return Math.round(base * mult * 100) / 100;
}
