import type { MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";
import { MAINTENANCE_INTERVAL_TYPE_LABELS } from "@/lib/maintenance-plans/maintenance-enums";
import {
  computeTriggerGroupForecast,
  type ForecastExplainability,
  type PresetTriggerGroupDef,
} from "@/lib/maintenance-plans/forecast/trigger-group-forecast";
import type { ExecutionPoint } from "@/lib/maintenance-plans/forecast/ema-forecast";
import type { ForecastResult } from "@/lib/maintenance-plans/forecast/ema-forecast";

export type ConfigDueInput = {
  groups: PresetTriggerGroupDef[];
  /** @deprecated Legacy cache — used only when groups is empty */
  intervalType: MaintenanceIntervalType;
  /** @deprecated Legacy cache — used only when groups is empty */
  intervalValue: number;
  currentValue: number;
  currentKm?: number | null;
  executions: ExecutionPoint[];
  today?: string;
};

export type ConfigDueResult = {
  forecast: ForecastResult;
  explainability: ForecastExplainability;
};

/** SSOT due evaluation — reads trigger groups only; legacy interval columns are fallback when groups empty. */
export function evaluateConfigDue(input: ConfigDueInput): ConfigDueResult {
  return computeTriggerGroupForecast({
    groups: input.groups,
    intervalType: input.intervalType,
    intervalValue: input.intervalValue,
    currentValue: input.currentValue,
    currentKm: input.currentKm,
    executions: input.executions,
    today: input.today,
  });
}

export function pickWinningTrigger(
  explainability: ForecastExplainability,
): MaintenanceIntervalType | null {
  return explainability.trigger_reason;
}

export function formatDueReason(input: {
  presetNome: string;
  explainability: ForecastExplainability | null;
  /** Fallback se `explainability.trigger_reason` manca (colonna forecast). */
  triggerReason?: MaintenanceIntervalType | null;
  currentValue?: number | null;
  remainingValue?: number | null;
  isOverdue?: boolean;
}): string {
  const { presetNome, explainability, currentValue, remainingValue, isOverdue } = input;
  const type = explainability?.trigger_reason ?? input.triggerReason ?? null;
  if (!type) {
    if (isOverdue && currentValue != null && remainingValue != null && remainingValue <= 0) {
      const limit = Math.round(currentValue + remainingValue);
      return `${presetNome} scaduto: raggiunti ${Math.round(currentValue)} (limite ${limit})`;
    }
    if (isOverdue) return `${presetNome} scaduto`;
    if (explainability?.due_date) return `${presetNome}: scadenza stimata ${explainability.due_date}`;
    return `${presetNome}: pianificazione in corso`;
  }

  const label = MAINTENANCE_INTERVAL_TYPE_LABELS[type];
  const alt = explainability?.groups.flatMap((g) => g.alternatives).find((a) => a.type === type);
  const overdue = isOverdue || alt?.isOverdue || (remainingValue != null && remainingValue <= 0);

  if (overdue) {
    if ((type === "ore" || type === "km") && currentValue != null && remainingValue != null) {
      // remaining = dueMilestone - current ⇒ due = current + remaining
      const limit = Math.round(currentValue + remainingValue);
      const unit = type === "km" ? "km" : "ore";
      const verb = type === "km" ? "raggiunti" : "raggiunte";
      return `${presetNome} scaduto: ${verb} ${Math.round(currentValue)} ${unit} (limite ${limit})`;
    }
    if (type === "mesi" || type === "giorni") {
      return `${presetNome} scaduto: raggiunta scadenza ${label}`;
    }
    return `${presetNome} scaduto (${label})`;
  }

  if (explainability?.due_date) {
    return `${presetNome}: prossima scadenza ${explainability.due_date} (${label})`;
  }
  return `${presetNome}: ${label}`;
}
