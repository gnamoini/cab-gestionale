import { HEALTH_SCORE_V2_DEFAULTS } from "@/lib/health-score/config/defaults";
import type { HealthScoreConfig } from "@/lib/health-score/config/schema";
import {
  effectiveTargetToBase,
  resolveTarget,
} from "@/lib/health-score/targets/target-provider";
import type { WorkshopSize } from "@/lib/health-score/types";

export type HealthScoreAreaTargetRow = {
  label: string;
  target: string;
};

export type HealthScoreAreaTargetGroup = {
  areaLabel: string;
  rows: HealthScoreAreaTargetRow[];
};

export type HealthScoreEditableTargetRow = {
  label: string;
  targetKey: string;
  unit: TargetUnit;
  direction: "min" | "max";
  resolvedValue: number;
  suffix: string;
  prefix: "≤" | "≥";
};

export type HealthScoreEditableTargetGroup = {
  areaLabel: string;
  rows: HealthScoreEditableTargetRow[];
};

type TargetUnit = "count" | "days" | "percent" | "hours" | "currency";

type AreaTargetDef = {
  areaLabel: string;
  label: string;
  targetKey: string;
  unit: TargetUnit;
  direction: "min" | "max";
};

/** ponytail: catalogo statico allineato a register-all — evita import registry lato client. */
const AREA_TARGET_DEFS: AreaTargetDef[] = [
  { areaLabel: "Produzione", label: "Lavori aperti in officina", targetKey: "backlog", unit: "count", direction: "max" },
  { areaLabel: "Produzione", label: "Anzianità media lavori aperti", targetKey: "backlog_avg_age_days", unit: "days", direction: "max" },
  { areaLabel: "Produzione", label: "Lavori chiusi nel periodo", targetKey: "completate_periodo", unit: "count", direction: "min" },
  { areaLabel: "Produzione", label: "Tempo medio di chiusura", targetKey: "close_time_days", unit: "days", direction: "max" },
  { areaLabel: "Produzione", label: "Tempo sui lavori urgenti", targetKey: "urgent_turnaround_days", unit: "days", direction: "max" },
  { areaLabel: "Produzione", label: "Quota lavori in ritardo", targetKey: "sla_late_pct", unit: "percent", direction: "max" },
  { areaLabel: "Magazzino", label: "Ricambi sotto scorta", targetKey: "stock_critical", unit: "count", direction: "max" },
  { areaLabel: "Magazzino", label: "Movimenti di magazzino", targetKey: "mag_movements", unit: "count", direction: "min" },
  { areaLabel: "Personale", label: "Ore lavorate dal team", targetKey: "hours_worked", unit: "hours", direction: "min" },
  { areaLabel: "Personale", label: "Straordinari", targetKey: "overtime_pct", unit: "percent", direction: "max" },
  { areaLabel: "Personale", label: "Assenze sulle ore lavorate", targetKey: "absence_pct", unit: "percent", direction: "max" },
  { areaLabel: "Economico", label: "Preventivi preparati", targetKey: "preventivi_emessi", unit: "count", direction: "min" },
  { areaLabel: "Economico", label: "Fatturato emesso", targetKey: "fatturato", unit: "currency", direction: "min" },
  { areaLabel: "Economico", label: "Incassi registrati", targetKey: "incassato", unit: "currency", direction: "min" },
];

function formatEuro(amount: number): string {
  if (amount >= 1000) {
    return `${Math.round(amount / 100) / 10}k €`.replace(".", ",");
  }
  return `${Math.round(amount)} €`;
}

function formatTargetValue(value: number, unit: TargetUnit): string {
  switch (unit) {
    case "days":
      return `${value} gg`;
    case "percent":
      return `${value}%`;
    case "hours":
      return `${value} h`;
    case "currency":
      return formatEuro(value);
    default:
      return Number.isInteger(value) ? String(value) : String(value);
  }
}

export function targetUnitSuffix(unit: TargetUnit): string {
  switch (unit) {
    case "days":
      return "gg";
    case "percent":
      return "%";
    case "hours":
      return "h";
    case "currency":
      return "€";
    default:
      return "";
  }
}

export function targetInputStep(unit: TargetUnit): string {
  switch (unit) {
    case "percent":
      return "0.1";
    case "currency":
      return "100";
    case "days":
      return "0.5";
    default:
      return "1";
  }
}

export function formatHealthScoreTargetLine(
  value: number,
  unit: TargetUnit,
  direction: "min" | "max",
): string {
  const formatted = formatTargetValue(value, unit);
  if (unit === "count" && value === 0 && direction === "max") {
    return "Nessuno";
  }
  return direction === "max" ? `≤ ${formatted}` : `≥ ${formatted}`;
}

function resolveHealthScoreConfig(
  config?: Partial<Pick<HealthScoreConfig, "targets">>,
): HealthScoreConfig {
  if (!config?.targets) return HEALTH_SCORE_V2_DEFAULTS;
  return { ...HEALTH_SCORE_V2_DEFAULTS, targets: { ...HEALTH_SCORE_V2_DEFAULTS.targets, ...config.targets } };
}

function filterAreaDefs(visibleAreaLabels?: string[]): AreaTargetDef[] {
  const visible = visibleAreaLabels?.length
    ? new Set(visibleAreaLabels.map((l) => l.trim().toLowerCase()))
    : null;
  return visible
    ? AREA_TARGET_DEFS.filter((def) => visible.has(def.areaLabel.toLowerCase()))
    : AREA_TARGET_DEFS;
}

export function buildHealthScoreAreaTargets(
  workshopSize: WorkshopSize,
  visibleAreaLabels?: string[],
  config?: Partial<Pick<HealthScoreConfig, "targets">>,
): HealthScoreAreaTargetGroup[] {
  const resolvedConfig = resolveHealthScoreConfig(config);
  const groups = new Map<string, HealthScoreAreaTargetRow[]>();

  for (const def of filterAreaDefs(visibleAreaLabels)) {
    const value = resolveTarget(def.targetKey, {
      workshopSize,
      config: resolvedConfig,
    });

    const rows = groups.get(def.areaLabel) ?? [];
    rows.push({
      label: def.label,
      target: formatHealthScoreTargetLine(value, def.unit, def.direction),
    });
    groups.set(def.areaLabel, rows);
  }

  return [...groups.entries()].map(([areaLabel, rows]) => ({ areaLabel, rows }));
}

export function buildEditableHealthScoreAreaTargets(
  workshopSize: WorkshopSize,
  visibleAreaLabels?: string[],
  config?: Partial<Pick<HealthScoreConfig, "targets">>,
): HealthScoreEditableTargetGroup[] {
  const resolvedConfig = resolveHealthScoreConfig(config);
  const groups = new Map<string, HealthScoreEditableTargetRow[]>();

  for (const def of filterAreaDefs(visibleAreaLabels)) {
    const resolvedValue = resolveTarget(def.targetKey, {
      workshopSize,
      config: resolvedConfig,
    });

    const rows = groups.get(def.areaLabel) ?? [];
    rows.push({
      label: def.label,
      targetKey: def.targetKey,
      unit: def.unit,
      direction: def.direction,
      resolvedValue,
      suffix: targetUnitSuffix(def.unit),
      prefix: def.direction === "max" ? "≤" : "≥",
    });
    groups.set(def.areaLabel, rows);
  }

  return [...groups.entries()].map(([areaLabel, rows]) => ({ areaLabel, rows }));
}

export function resolvedTargetsToBasePatches(
  workshopSize: WorkshopSize,
  resolvedByKey: Record<string, number>,
): Record<string, number> {
  const patches: Record<string, number> = {};
  for (const def of AREA_TARGET_DEFS) {
    const resolved = resolvedByKey[def.targetKey];
    if (resolved == null || !Number.isFinite(resolved)) continue;
    patches[def.targetKey] = effectiveTargetToBase(resolved, def.targetKey, workshopSize);
  }
  return patches;
}
