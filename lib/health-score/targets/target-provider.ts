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

export function getSizeTargetMultiplier(workshopSize: WorkshopSize, targetKey: string): number {
  return SIZE_TARGET_MULTIPLIERS[workshopSize][targetKey] ?? 1;
}

export function effectiveTargetToBase(
  effective: number,
  targetKey: string,
  workshopSize: WorkshopSize,
): number {
  const mult = getSizeTargetMultiplier(workshopSize, targetKey);
  if (mult === 0) return effective;
  return Math.round((effective / mult) * 100) / 100;
}

export function resolveTarget(targetKey: string, ctx: TargetContext): number {
  const settingsOverride = ctx.config.targets[targetKey];
  const globalDefault = HEALTH_SCORE_V2_DEFAULTS.targets[targetKey];
  const base = settingsOverride ?? globalDefault ?? 0;
  const mult = getSizeTargetMultiplier(ctx.workshopSize, targetKey);
  return Math.round(base * mult * 100) / 100;
}
