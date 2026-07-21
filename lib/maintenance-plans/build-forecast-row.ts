import type { ForecastResult } from "@/lib/maintenance-plans/forecast/ema-forecast";
import { FORECAST_ENGINE_VERSION } from "@/lib/maintenance-plans/maintenance-enums";

export type ForecastDbRow = {
  config_id: string;
  computed_at: string;
  next_date_estimated: string | null;
  next_milestone_value: number;
  remaining_value: number;
  confidence_level: string;
  confidence_pct: number;
  confidence_reason: string;
  ema_rate_per_day: number | null;
  observation_count: number;
  variance: number | null;
  stddev: number | null;
  engine_version: string;
};

export function buildForecastDbRow(
  configId: string,
  forecast: ForecastResult,
  computedAt = new Date().toISOString(),
): ForecastDbRow {
  return {
    config_id: configId,
    computed_at: computedAt,
    next_date_estimated: forecast.nextDateEstimated,
    next_milestone_value: forecast.nextMilestoneValue,
    remaining_value: forecast.remainingValue,
    confidence_level: forecast.confidenceLevel,
    confidence_pct: forecast.confidencePct,
    confidence_reason: forecast.confidenceReason,
    ema_rate_per_day: forecast.emaRatePerDay,
    observation_count: forecast.observationCount,
    variance: forecast.variance,
    stddev: forecast.stddev,
    engine_version: forecast.engineVersion || FORECAST_ENGINE_VERSION,
  };
}
