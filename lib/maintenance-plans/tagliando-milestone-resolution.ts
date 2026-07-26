import { resolveMilestones } from "@/lib/maintenance-plans/forecast/ema-forecast";
import type { MaintenanceServiceHistoryView } from "@/lib/maintenance-plans/types";
import type { MaintenanceServiceLite } from "@/lib/maintenance-plans/tagliandi-matrix";
import { findServiceAtMilestone, isMilestoneApplicable } from "@/lib/maintenance-plans/tagliandi-matrix";

/** Colonne milestone (es. 500, 1000, …) per hub singolo mezzo/piano. */
export function buildHubMilestoneColumnOres(input: {
  intervalOre: number;
  currentOre: number;
  doneMilestoneOres: readonly number[];
  minColumns?: number;
  maxColumns?: number;
}): number[] {
  return buildHubMilestoneValues({
    interval: input.intervalOre,
    currentValue: input.currentOre,
    doneValues: input.doneMilestoneOres,
    minColumns: input.minColumns,
    maxColumns: input.maxColumns,
  });
}

export function buildHubMilestoneValues(input: {
  interval: number;
  currentValue: number;
  doneValues: readonly number[];
  minColumns?: number;
  maxColumns?: number;
}): number[] {
  const interval = input.interval;
  if (interval <= 0) return [];

  const minColumns = input.minColumns ?? 4;
  const maxColumns = input.maxColumns ?? 24;
  let maxValue = Math.max(input.currentValue, interval);
  for (const value of input.doneValues) {
    if (isMilestoneApplicable(interval, value)) maxValue = Math.max(maxValue, value);
  }

  const count = Math.min(maxColumns, Math.max(minColumns, Math.ceil(maxValue / interval)));
  return Array.from({ length: count }, (_, i) => (i + 1) * interval);
}

/** Ore milestone già registrate per mezzo + piano. */
export function collectDoneMilestoneOres(
  services: MaintenanceServiceLite[],
  mezzoId: string,
  planId: string,
): number[] {
  return services
    .filter((s) => s.mezzoId === mezzoId && s.planId === planId)
    .map((s) => s.oreAtService)
    .filter((ore) => ore > 0);
}

/**
 * Primo scaglione non ancora registrato (500 → 1000 → 1500 …),
 * indipendentemente dalle ore attuali del mezzo.
 */
export function resolveNextUndoneMilestoneOre(input: {
  intervalOre: number;
  doneMilestoneOres: readonly number[];
}): number {
  const interval = input.intervalOre;
  if (interval <= 0) return 0;

  const done = new Set(
    input.doneMilestoneOres.filter((ore) => ore > 0 && isMilestoneApplicable(interval, ore)),
  );

  let n = 1;
  while (n <= 10_000) {
    const milestone = n * interval;
    if (!done.has(milestone)) return milestone;
    n += 1;
  }

  const maxDone = done.size > 0 ? Math.max(...done) : 0;
  return maxDone + interval;
}

export function historyToMaintenanceServicesLite(
  mezzoId: string,
  history: readonly { id: string; planId: string; oreAtService: number }[],
): MaintenanceServiceLite[] {
  return history.map((row) => ({
    id: row.id,
    mezzoId,
    planId: row.planId,
    oreAtService: row.oreAtService,
  }));
}

export function findMilestoneService(
  services: MaintenanceServiceLite[],
  mezzoId: string,
  planId: string,
  milestoneOre: number,
): MaintenanceServiceLite | null {
  return findServiceAtMilestone(services, mezzoId, planId, milestoneOre);
}

export type MilestoneUnit = "ore" | "km";

export type ResolvedMilestoneInterval = {
  unit: MilestoneUnit;
  interval: number;
};

/** Intervallo scaglioni: solo trigger/config espliciti ore o km (no fallback legacy ambiguo). */
export function resolveMilestoneInterval(input: {
  intervalType: string;
  intervalValue: number;
  planTriggers?: readonly { triggerType: string; threshold: number }[];
}): ResolvedMilestoneInterval | null {
  const oreTrigger = input.planTriggers?.find((t) => t.triggerType === "ore" && t.threshold > 0);
  if (oreTrigger) return { unit: "ore", interval: oreTrigger.threshold };
  const kmTrigger = input.planTriggers?.find((t) => t.triggerType === "km" && t.threshold > 0);
  if (kmTrigger) return { unit: "km", interval: kmTrigger.threshold };
  if (input.intervalType === "ore" && input.intervalValue > 0) {
    return { unit: "ore", interval: input.intervalValue };
  }
  if (input.intervalType === "km" && input.intervalValue > 0) {
    return { unit: "km", interval: input.intervalValue };
  }
  return null;
}

/** @deprecated Usare resolveMilestoneInterval */
export function resolveMilestoneIntervalOre(input: {
  intervalType: string;
  intervalValue: number;
  planIntervalOre?: number | null;
  planTriggers?: readonly { triggerType: string; threshold: number }[];
}): number | null {
  const resolved = resolveMilestoneInterval({
    intervalType: input.intervalType,
    intervalValue: input.intervalValue,
    planTriggers: input.planTriggers,
  });
  return resolved?.unit === "ore" ? resolved.interval : null;
}

export function formatMilestoneThreshold(unit: MilestoneUnit, value: number): string {
  const formatted = value.toLocaleString("it-IT");
  return unit === "km" ? `${formatted} km` : `${formatted} h`;
}

export function mezzoMeteringFromGestito(mezzo: { oreKm?: number; km?: number; ultimoKmRilevato?: number | null }): {
  ore: number;
  km: number;
} {
  return {
    ore: mezzo.oreKm ?? 0,
    km: mezzo.km ?? mezzo.ultimoKmRilevato ?? 0,
  };
}

export type AnchoredMilestoneExecution = {
  value: number;
  performedAt?: string;
  serviceId?: string;
  lavorazioneId?: string | null;
  synthetic?: boolean;
};

export type AnchoredHubMilestoneRow = {
  value: number;
  done: boolean;
  state: "done" | "pending" | "overdue";
  performedAt?: string;
  serviceId?: string;
  lavorazioneId?: string | null;
  synthetic?: boolean;
};

/** Valore contatore (ore/km) al momento dell'esecuzione tagliando. */
export function serviceMeterAtExecution(
  row: Pick<MaintenanceServiceHistoryView, "oreAtService" | "kmAtService">,
  unit: MilestoneUnit,
): number {
  if (unit === "km") {
    const km = row.kmAtService ?? row.oreAtService;
    return km > 0 ? km : row.oreAtService;
  }
  return row.oreAtService;
}

export function anchoredMilestoneCellState(input: {
  milestoneValue: number;
  currentValue: number;
  done: boolean;
}): "done" | "pending" | "overdue" {
  if (input.done) return "done";
  if (input.currentValue >= input.milestoneValue) return "overdue";
  return "pending";
}

/** Scaglioni hub ancorati all'ultima esecuzione reale (non griglia fissa da zero). */
export function buildAnchoredHubMilestones(input: {
  interval: number;
  currentValue: number;
  executions: readonly AnchoredMilestoneExecution[];
  minFuture?: number;
  maxRows?: number;
}): AnchoredHubMilestoneRow[] {
  const interval = input.interval;
  if (interval <= 0) return [];

  const minFuture = input.minFuture ?? 3;
  const maxRows = input.maxRows ?? 24;

  const sorted = [...input.executions]
    .filter((e) => e.value > 0)
    .sort((a, b) => {
      const d = a.value - b.value;
      if (d !== 0) return d;
      return (a.performedAt ?? "").localeCompare(b.performedAt ?? "");
    });

  const doneRows: AnchoredHubMilestoneRow[] = sorted.map((e) => ({
    value: e.value,
    done: true,
    state: "done" as const,
    performedAt: e.performedAt,
    serviceId: e.serviceId,
    lavorazioneId: e.lavorazioneId,
    synthetic: e.synthetic,
  }));

  const maxDone = sorted.length > 0 ? Math.max(...sorted.map((e) => e.value)) : null;
  const doneValues = new Set(sorted.map((e) => e.value));
  const futureValues: number[] = [];

  if (maxDone == null) {
    for (let n = 1; n <= minFuture; n++) futureValues.push(n * interval);
  } else {
    const { nextMilestoneValue } = resolveMilestones({
      ultimo: maxDone,
      currentValue: input.currentValue,
      intervalValue: interval,
    });
    let next = nextMilestoneValue;
    let guard = 0;
    while (futureValues.length < minFuture && doneRows.length + futureValues.length < maxRows && guard < 100) {
      guard += 1;
      if (!doneValues.has(next)) futureValues.push(next);
      next += interval;
    }
  }

  const futureRows: AnchoredHubMilestoneRow[] = futureValues
    .filter((v) => !doneValues.has(v))
    .map((value) => ({
      value,
      done: false,
      state: anchoredMilestoneCellState({
        milestoneValue: value,
        currentValue: input.currentValue,
        done: false,
      }),
    }));

  return [...doneRows, ...futureRows].slice(0, maxRows);
}

export function historyToAnchoredExecutions(
  history: readonly MaintenanceServiceHistoryView[],
  unit: MilestoneUnit,
): AnchoredMilestoneExecution[] {
  const out: AnchoredMilestoneExecution[] = [];
  for (const row of history) {
    const value = serviceMeterAtExecution(row, unit);
    if (value <= 0) continue;
    out.push({
      value,
      performedAt: row.performedAt,
      serviceId: row.id,
      lavorazioneId: row.lavorazioneId,
      synthetic: row.synthetic === true,
    });
  }
  return out;
}
