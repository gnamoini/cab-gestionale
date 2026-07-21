import type { MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";
import { MAINTENANCE_INTERVAL_TYPE_LABELS } from "@/lib/maintenance-plans/maintenance-enums";
import type { EffectivePart, EffectivePreset } from "@/lib/maintenance-plans/resolve-effective-preset";

export type PresetSnapshotPart = {
  ricambioId: string;
  name: string;
  qty: number;
  isRequired: boolean;
  codice?: string;
};

export type PresetSnapshot = {
  name: string;
  trigger: string;
  intervalType?: MaintenanceIntervalType;
  intervalValue?: number;
  parts: PresetSnapshotPart[];
  checklist?: { label: string; isRequired: boolean }[];
  capturedAt: string;
};

export function formatTriggerLabel(type: MaintenanceIntervalType, value: number): string {
  return `${value} ${MAINTENANCE_INTERVAL_TYPE_LABELS[type]}`;
}

export function buildPresetSnapshot(input: {
  preset: EffectivePreset;
  triggerLabel?: string;
  checklist?: { label: string; isRequired: boolean }[];
  partsOverride?: EffectivePart[];
}): PresetSnapshot {
  const parts = (input.partsOverride ?? input.preset.parts).map((p) => ({
    ricambioId: p.ricambioId,
    name: p.descrizione,
    qty: p.quantita,
    isRequired: p.isRequired,
    codice: p.codice,
  }));

  return {
    name: input.preset.nome,
    trigger:
      input.triggerLabel ??
      formatTriggerLabel(input.preset.intervalType, input.preset.intervalValue),
    intervalType: input.preset.intervalType,
    intervalValue: input.preset.intervalValue,
    parts,
    checklist: input.checklist,
    capturedAt: new Date().toISOString(),
  };
}
