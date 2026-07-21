import { emaSmooth } from "@/lib/health-score/smoothing/ema-smooth";
import type { ConfidenceLevel, MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";
import { FORECAST_ENGINE_VERSION } from "@/lib/maintenance-plans/maintenance-enums";

export type ExecutionPoint = {
  performedAt: string;
  valueAtService: number;
};

export type ForecastInput = {
  intervalType: MaintenanceIntervalType;
  intervalValue: number;
  currentValue: number;
  executions: ExecutionPoint[];
  alpha?: number;
  today?: string;
};

export type ForecastResult = {
  nextMilestoneValue: number;
  dueMilestoneValue: number;
  remainingValue: number;
  intervalsCrossed: number;
  isOverdue: boolean;
  nextDateEstimated: string | null;
  emaRatePerDay: number | null;
  observationCount: number;
  variance: number | null;
  stddev: number | null;
  confidenceLevel: ConfidenceLevel;
  confidencePct: number;
  confidenceReason: string;
  engineVersion: string;
};

const DEFAULT_ALPHA = 0.3;
const IDLE_DAYS_THRESHOLD = 90;

function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T12:00:00`).getTime();
  const db = new Date(`${b}T12:00:00`).getTime();
  const diff = (db - da) / (1000 * 60 * 60 * 24);
  return diff > 0 ? diff : 0;
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

export function resolveMilestones(input: {
  ultimo: number | null;
  currentValue: number;
  intervalValue: number;
}): {
  dueMilestoneValue: number;
  nextMilestoneValue: number;
  remainingValue: number;
  intervalsCrossed: number;
  isOverdue: boolean;
} {
  const { ultimo, currentValue, intervalValue } = input;
  if (ultimo == null) {
    const next = intervalValue;
    return {
      dueMilestoneValue: next,
      nextMilestoneValue: next,
      remainingValue: next - currentValue,
      intervalsCrossed: 0,
      isOverdue: currentValue >= next,
    };
  }

  const firstDue = ultimo + intervalValue;
  if (currentValue <= firstDue) {
    return {
      dueMilestoneValue: firstDue,
      nextMilestoneValue: firstDue,
      remainingValue: firstDue - currentValue,
      intervalsCrossed: 0,
      isOverdue: false,
    };
  }

  const periodsSince = Math.floor((currentValue - ultimo) / intervalValue);
  const dueMilestoneValue = ultimo + periodsSince * intervalValue;
  const nextMilestoneValue = dueMilestoneValue + intervalValue;
  const intervalsCrossed = Math.ceil((currentValue - firstDue) / intervalValue);

  return {
    dueMilestoneValue,
    nextMilestoneValue,
    remainingValue: dueMilestoneValue - currentValue,
    intervalsCrossed: Math.max(1, intervalsCrossed),
    isOverdue: true,
  };
}

function buildConfidence(input: {
  observationCount: number;
  meanRate: number;
  stddev: number;
  outlierCount: number;
  sortedLength: number;
}): { level: ConfidenceLevel; pct: number; reason: string } {
  if (input.sortedLength < 2 || input.observationCount < 1) {
    return {
      level: "bassa",
      pct: 20,
      reason: `Bassa: solo ${input.sortedLength} tagliandi registrati`,
    };
  }
  if (input.observationCount < 2) {
    return {
      level: "bassa",
      pct: 35,
      reason: "Bassa: un solo intervallo osservato",
    };
  }
  const cv = input.meanRate > 0 ? input.stddev / input.meanRate : 1;
  if (input.outlierCount > 0) {
    return {
      level: "media",
      pct: 55,
      reason: `Media: ${input.outlierCount} outlier rilevati, varianza σ=${input.stddev.toFixed(1)}`,
    };
  }
  if (input.observationCount >= 5 && cv < 0.25) {
    return {
      level: "alta",
      pct: 90,
      reason: `Alta: ${input.sortedLength} tagliandi, varianza minima`,
    };
  }
  if (input.observationCount >= 3) {
    return {
      level: "media",
      pct: 65,
      reason: `Media: ${input.observationCount} osservazioni, σ=${input.stddev.toFixed(1)}`,
    };
  }
  return {
    level: "bassa",
    pct: 40,
    reason: `Bassa: solo ${input.observationCount} osservazioni`,
  };
}

function idleUsageReason(sorted: ExecutionPoint[], today: string): string | null {
  if (sorted.length === 0) return null;
  const last = sorted[sorted.length - 1]!;
  const idleDays = daysBetween(last.performedAt, today);
  if (idleDays >= IDLE_DAYS_THRESHOLD) {
    return `insufficient_usage_history: nessun utilizzo negli ultimi ${Math.round(idleDays)} giorni`;
  }
  return null;
}

export function computeEmaForecast(input: ForecastInput): ForecastResult {
  const sorted = [...input.executions].sort((a, b) => a.performedAt.localeCompare(b.performedAt));
  const ultimo = sorted.length > 0 ? sorted[sorted.length - 1]!.valueAtService : null;
  const today = input.today ?? new Date().toISOString().slice(0, 10);

  const milestones = resolveMilestones({
    ultimo,
    currentValue: input.currentValue,
    intervalValue: input.intervalValue,
  });

  if (input.intervalType === "giorni") {
    const lastDate = sorted.length > 0 ? sorted[sorted.length - 1]!.performedAt : null;
    const nextDate = lastDate ? addDays(lastDate, input.intervalValue) : null;
    const remaining = nextDate ? daysBetween(today, nextDate) : milestones.remainingValue;
    return {
      nextMilestoneValue: milestones.nextMilestoneValue,
      dueMilestoneValue: milestones.dueMilestoneValue,
      remainingValue: remaining,
      intervalsCrossed: milestones.intervalsCrossed,
      isOverdue: milestones.isOverdue || remaining < 0,
      nextDateEstimated: nextDate,
      emaRatePerDay: null,
      observationCount: sorted.length,
      variance: null,
      stddev: null,
      confidenceLevel: sorted.length >= 3 ? "media" : "bassa",
      confidencePct: sorted.length >= 3 ? 60 : 25,
      confidenceReason:
        sorted.length < 2
          ? `Bassa: solo ${sorted.length} esecuzioni registrate`
          : "Media: intervallo calendario",
      engineVersion: FORECAST_ENGINE_VERSION,
    };
  }

  const rates: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const days = daysBetween(sorted[i]!.performedAt, sorted[i + 1]!.performedAt);
    if (days <= 0) continue;
    const delta = sorted[i + 1]!.valueAtService - sorted[i]!.valueAtService;
    if (delta > 0) rates.push(delta / days);
  }

  const observationCount = rates.length;
  if (observationCount === 0) {
    const idleReason = idleUsageReason(sorted, today);
    return {
      nextMilestoneValue: milestones.nextMilestoneValue,
      dueMilestoneValue: milestones.dueMilestoneValue,
      remainingValue: milestones.remainingValue,
      intervalsCrossed: milestones.intervalsCrossed,
      isOverdue: milestones.isOverdue,
      nextDateEstimated: null,
      emaRatePerDay: null,
      observationCount: sorted.length,
      variance: null,
      stddev: null,
      confidenceLevel: "bassa",
      confidencePct: 15,
      confidenceReason:
        idleReason ?? "Bassa: dati insufficienti per stimare il ritmo",
      engineVersion: FORECAST_ENGINE_VERSION,
    };
  }

  const alpha = input.alpha ?? DEFAULT_ALPHA;
  let ema: number | null = null;
  for (const r of rates) {
    ema = emaSmooth(r, ema, alpha);
  }

  const mean = rates.reduce((s, v) => s + v, 0) / rates.length;
  const variance =
    rates.length > 1
      ? rates.reduce((s, v) => s + (v - mean) ** 2, 0) / (rates.length - 1)
      : 0;
  const stddev = Math.sqrt(variance);

  let outlierCount = 0;
  if (stddev > 0) {
    for (const r of rates) {
      if (Math.abs(r - mean) > 2 * stddev) outlierCount++;
    }
  }

  const { level, pct, reason } = buildConfidence({
    observationCount,
    meanRate: mean,
    stddev,
    outlierCount,
    sortedLength: sorted.length,
  });

  const emaRate = ema ?? mean;
  const remainingForEta =
    milestones.isOverdue
      ? milestones.nextMilestoneValue - input.currentValue
      : milestones.remainingValue;
  const daysToNext = emaRate > 0 && remainingForEta > 0 ? remainingForEta / emaRate : null;
  const nextDate = daysToNext != null ? addDays(today, daysToNext) : null;

  return {
    nextMilestoneValue: milestones.nextMilestoneValue,
    dueMilestoneValue: milestones.dueMilestoneValue,
    remainingValue: milestones.remainingValue,
    intervalsCrossed: milestones.intervalsCrossed,
    isOverdue: milestones.isOverdue,
    nextDateEstimated: nextDate,
    emaRatePerDay: emaRate,
    observationCount,
    variance,
    stddev,
    confidenceLevel: level,
    confidencePct: pct,
    confidenceReason: reason,
    engineVersion: FORECAST_ENGINE_VERSION,
  };
}

export type ForecastHistoryEntry = {
  computedAt: string;
  nextDateEstimated: string | null;
  confidencePct: number;
};

export function computeForecastAccuracy(
  history: ForecastHistoryEntry[],
  actualDate: string,
): { errorDays: number; within7Days: boolean } | null {
  if (history.length === 0) return null;
  const before = history
    .filter((h) => h.computedAt <= actualDate && h.nextDateEstimated)
    .sort((a, b) => b.computedAt.localeCompare(a.computedAt))[0];
  if (!before?.nextDateEstimated) return null;
  const predicted = new Date(`${before.nextDateEstimated}T12:00:00`).getTime();
  const actual = new Date(`${actualDate}T12:00:00`).getTime();
  const errorDays = Math.round(Math.abs(actual - predicted) / (1000 * 60 * 60 * 24));
  return { errorDays, within7Days: errorDays <= 7 };
}
