import type { MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";
import type { MaintenanceTask } from "@/lib/maintenance-plans/maintenance-task";
import {
  checklistToMaintenanceTasks,
  mergeMaintenanceTasks,
  partsToMaintenanceTasks,
} from "@/lib/maintenance-plans/preset-to-tasks";
import type { EffectivePart } from "@/lib/maintenance-plans/resolve-effective-preset";
import type {
  MaintenanceChecklistItemView,
  MaintenancePresetTriggerGroupView,
} from "@/lib/maintenance-plans/types";

export const SNAPSHOT_SCHEMA_VERSION = "v1.0";

export type ForecastResetPolicy = "full" | "partial" | "none";

export type TriggerGroupSnapshot = {
  operator: string;
  label: string;
  triggers: { triggerType: MaintenanceIntervalType; threshold: number }[];
};

export type FullPresetSnapshot = {
  schemaVersion: string;
  capturedAt: string;
  name: string;
  versionLabel: string;
  category?: string;
  manufacturer?: string;
  model?: string;
  presetRef?: string;
  presetVersionRef?: string;
  tasks: MaintenanceTask[];
  triggerGroups: TriggerGroupSnapshot[];
  forecastResetPolicy: ForecastResetPolicy;
  standardTimeMinutes?: number;
  laborCostPerHour?: number;
  notes?: string;
};

export type BuildFullPresetSnapshotInput = {
  name: string;
  versionLabel?: string;
  versionNumber?: number;
  presetRef?: string;
  presetVersionRef?: string;
  parts?: EffectivePart[];
  checklist?: MaintenanceChecklistItemView[];
  triggerGroups?: MaintenancePresetTriggerGroupView[];
  forecastResetPolicy?: ForecastResetPolicy;
  standardTimeMinutes?: number | null;
  laborCostPerHour?: number | null;
  notes?: string;
  maintenanceExecutionKind?: "scheduled" | "extraordinary" | null;
};

function defaultForecastPolicy(
  kind: BuildFullPresetSnapshotInput["maintenanceExecutionKind"],
): ForecastResetPolicy {
  if (kind === "extraordinary") return "none";
  return "full";
}

export function buildMinimalPresetSnapshot(notes?: string): FullPresetSnapshot {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    capturedAt: new Date().toISOString(),
    name: "Senza preset",
    versionLabel: "—",
    tasks: [],
    triggerGroups: [],
    forecastResetPolicy: "none",
    notes: notes?.trim() || undefined,
  };
}

export function buildFullPresetSnapshot(input: BuildFullPresetSnapshotInput): FullPresetSnapshot {
  const versionNum = input.versionNumber ?? 1;
  const versionLabel = input.versionLabel?.trim() || `Versione ${versionNum}`;
  const parts = input.parts ?? [];
  const checklist = input.checklist ?? [];
  const tasks = mergeMaintenanceTasks(
    partsToMaintenanceTasks(parts),
    checklistToMaintenanceTasks(checklist),
  );
  const triggerGroups: TriggerGroupSnapshot[] = (input.triggerGroups ?? []).map((g) => ({
    operator: g.operator,
    label: g.label,
    triggers: g.triggers.map((t) => ({
      triggerType: t.triggerType,
      threshold: t.threshold,
    })),
  }));

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    capturedAt: new Date().toISOString(),
    name: input.name,
    versionLabel,
    presetRef: input.presetRef,
    presetVersionRef: input.presetVersionRef,
    tasks,
    triggerGroups,
    forecastResetPolicy: input.forecastResetPolicy ?? defaultForecastPolicy(input.maintenanceExecutionKind),
    standardTimeMinutes: input.standardTimeMinutes ?? undefined,
    laborCostPerHour: input.laborCostPerHour ?? undefined,
    notes: input.notes?.trim() || undefined,
  };
}

export function parseFullPresetSnapshot(raw: unknown): FullPresetSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.name !== "string") return null;
  return {
    schemaVersion: String(o.schemaVersion ?? SNAPSHOT_SCHEMA_VERSION),
    capturedAt: String(o.capturedAt ?? ""),
    name: o.name,
    versionLabel: String(o.versionLabel ?? "—"),
    presetRef: typeof o.presetRef === "string" ? o.presetRef : undefined,
    presetVersionRef: typeof o.presetVersionRef === "string" ? o.presetVersionRef : undefined,
    tasks: Array.isArray(o.tasks) ? (o.tasks as MaintenanceTask[]) : [],
    triggerGroups: Array.isArray(o.triggerGroups) ? (o.triggerGroups as TriggerGroupSnapshot[]) : [],
    forecastResetPolicy: (o.forecastResetPolicy as ForecastResetPolicy) ?? "full",
    standardTimeMinutes: typeof o.standardTimeMinutes === "number" ? o.standardTimeMinutes : undefined,
    laborCostPerHour: typeof o.laborCostPerHour === "number" ? o.laborCostPerHour : undefined,
    notes: typeof o.notes === "string" ? o.notes : undefined,
  };
}

export function snapshotDisplayName(snapshot: FullPresetSnapshot | null | undefined): string {
  if (!snapshot) return "Senza preset";
  return `${snapshot.name} · ${snapshot.versionLabel}`;
}
