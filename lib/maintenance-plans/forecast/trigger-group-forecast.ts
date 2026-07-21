import type { MaintenanceIntervalType, MaintenanceTriggerGroupOperator } from "@/lib/maintenance-plans/maintenance-enums";
import { computeEmaForecast, type ExecutionPoint, type ForecastResult } from "@/lib/maintenance-plans/forecast/ema-forecast";

export type PresetTriggerDef = {
  triggerType: MaintenanceIntervalType;
  threshold: number;
  priority: number;
};

export type PresetTriggerGroupDef = {
  operator: MaintenanceTriggerGroupOperator;
  sortOrder: number;
  triggers: PresetTriggerDef[];
};

export type TriggerAlternative = {
  type: MaintenanceIntervalType;
  due: string | null;
  remaining: number;
  isOverdue: boolean;
};

export type TriggerGroupExplainability = {
  operator: MaintenanceTriggerGroupOperator;
  winningTrigger: MaintenanceIntervalType | null;
  alternatives: TriggerAlternative[];
  groupDueDate: string | null;
  groupIsOverdue: boolean;
};

export type ForecastExplainability = {
  trigger_reason: MaintenanceIntervalType | null;
  due_date: string | null;
  groups: TriggerGroupExplainability[];
};

function addMonths(ymd: string, months: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

function forecastSingleTrigger(input: {
  triggerType: MaintenanceIntervalType;
  threshold: number;
  currentValue: number;
  executions: ExecutionPoint[];
  today: string;
}): { dueDate: string | null; remaining: number; isOverdue: boolean; forecast: ForecastResult } {
  const { triggerType, threshold, currentValue, executions, today } = input;

  if (triggerType === "giorni" || triggerType === "mesi") {
    const last = executions.length > 0 ? executions[executions.length - 1]!.performedAt : null;
    if (!last) {
      const due = triggerType === "mesi" ? addMonths(today, threshold) : addDays(today, threshold);
      return { dueDate: due, remaining: threshold, isOverdue: false, forecast: emptyCalendarForecast(threshold) };
    }
    const due =
      triggerType === "mesi" ? addMonths(last, threshold) : addDays(last, threshold);
    const remainingDays = Math.ceil(
      (new Date(`${due}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return {
      dueDate: due,
      remaining: remainingDays,
      isOverdue: remainingDays <= 0,
      forecast: emptyCalendarForecast(threshold),
    };
  }

  const forecast = computeEmaForecast({
    intervalType: triggerType,
    intervalValue: threshold,
    currentValue,
    executions,
    today,
  });
  return {
    dueDate: forecast.nextDateEstimated,
    remaining: forecast.remainingValue,
    isOverdue: forecast.isOverdue,
    forecast,
  };
}

function emptyCalendarForecast(threshold: number): ForecastResult {
  return {
    nextMilestoneValue: threshold,
    dueMilestoneValue: threshold,
    remainingValue: threshold,
    intervalsCrossed: 0,
    isOverdue: false,
    nextDateEstimated: null,
    emaRatePerDay: null,
    observationCount: 0,
    variance: null,
    stddev: null,
    confidenceLevel: "bassa",
    confidencePct: 30,
    confidenceReason: "Intervallo calendario",
    engineVersion: "v2.0",
  };
}

function evaluateGroup(
  group: PresetTriggerGroupDef,
  input: {
    currentValue: number;
    executions: ExecutionPoint[];
    today: string;
    valueForType: (type: MaintenanceIntervalType) => number;
  },
): TriggerGroupExplainability {
  const alternatives: TriggerAlternative[] = group.triggers.map((t) => {
    const r = forecastSingleTrigger({
      triggerType: t.triggerType,
      threshold: t.threshold,
      currentValue: input.valueForType(t.triggerType),
      executions: input.executions,
      today: input.today,
    });
    return {
      type: t.triggerType,
      due: r.dueDate,
      remaining: r.remaining,
      isOverdue: r.isOverdue,
    };
  });

  if (alternatives.length === 0) {
    return {
      operator: group.operator,
      winningTrigger: null,
      alternatives: [],
      groupDueDate: null,
      groupIsOverdue: false,
    };
  }

  let winning: TriggerAlternative;
  if (group.operator === "OR") {
    const overdue = alternatives.filter((a) => a.isOverdue);
    if (overdue.length > 0) {
      winning = overdue.reduce((best, cur) => {
        if (!best.due) return cur;
        if (!cur.due) return best;
        return cur.due < best.due ? cur : best;
      });
    } else {
      winning = alternatives.reduce((best, cur) => {
        if (cur.isOverdue && !best.isOverdue) return cur;
        if (!cur.isOverdue && best.isOverdue) return best;
        if (cur.due == null) return best;
        if (best.due == null) return cur;
        return cur.due < best.due ? cur : best;
      });
    }
  } else {
    winning = alternatives.reduce((worst, cur) => {
      if (cur.due == null) return worst;
      if (worst.due == null) return cur;
      return cur.due > worst.due ? cur : worst;
    });
  }

  return {
    operator: group.operator,
    winningTrigger: winning.type,
    alternatives,
    groupDueDate: winning.due,
    groupIsOverdue: winning.isOverdue,
  };
}

export function computeTriggerGroupForecast(input: {
  groups: PresetTriggerGroupDef[];
  intervalType: MaintenanceIntervalType;
  intervalValue: number;
  currentValue: number;
  currentKm?: number | null;
  executions: ExecutionPoint[];
  today?: string;
}): { forecast: ForecastResult; explainability: ForecastExplainability } {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const valueForType = (type: MaintenanceIntervalType): number => {
    if (type === "km") return input.currentKm ?? input.currentValue;
    if (type === "giorni" || type === "mesi") return 0;
    return input.currentValue;
  };

  const groups =
    input.groups.length > 0
      ? input.groups
      : [
          {
            operator: "OR" as const,
            sortOrder: 0,
            triggers: [{ triggerType: input.intervalType, threshold: input.intervalValue, priority: 0 }],
          },
        ];

  const evaluated = groups
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) =>
      evaluateGroup(g, {
        currentValue: input.currentValue,
        executions: input.executions,
        today,
        valueForType,
      }),
    );

  const binding = evaluated.reduce(
    (acc, g) => {
      const overdueAlt = g.alternatives.find((a) => a.isOverdue);
      if (overdueAlt) {
        return { due: overdueAlt.due, reason: overdueAlt.type, isOverdue: true };
      }
      if (!g.groupDueDate) return acc;
      if (!acc.due || g.groupDueDate < acc.due) {
        return { due: g.groupDueDate, reason: g.winningTrigger, isOverdue: g.groupIsOverdue };
      }
      return acc;
    },
    { due: null as string | null, reason: null as MaintenanceIntervalType | null, isOverdue: false },
  );

  const primaryGroup = groups[0]!;
  const primaryTrigger = primaryGroup.triggers[0] ?? {
    triggerType: input.intervalType,
    threshold: input.intervalValue,
    priority: 0,
  };
  const base = forecastSingleTrigger({
    triggerType: primaryTrigger.triggerType,
    threshold: primaryTrigger.threshold,
    currentValue: valueForType(primaryTrigger.triggerType),
    executions: input.executions,
    today,
  });

  const forecast: ForecastResult = {
    ...base.forecast,
    nextDateEstimated: binding.due ?? base.forecast.nextDateEstimated,
    isOverdue: binding.isOverdue || base.forecast.isOverdue,
    confidenceReason: binding.reason
      ? `Scadenza determinata da ${binding.reason}`
      : base.forecast.confidenceReason,
  };

  return {
    forecast,
    explainability: {
      trigger_reason: binding.reason,
      due_date: binding.due,
      groups: evaluated,
    },
  };
}
