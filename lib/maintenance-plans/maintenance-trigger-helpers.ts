import type { MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";
import { MAINTENANCE_INTERVAL_TYPE_LABELS } from "@/lib/maintenance-plans/maintenance-enums";
import type { MaintenancePresetTriggerView } from "@/lib/maintenance-plans/types";

export function formatTriggerSummary(triggers: MaintenancePresetTriggerView[]): string {
  if (triggers.length === 0) return "—";
  return triggers
    .map((t) => `${t.threshold.toLocaleString("it-IT")} ${MAINTENANCE_INTERVAL_TYPE_LABELS[t.triggerType]}`)
    .join(" oppure ");
}

export function triggersNeedKm(triggers: MaintenancePresetTriggerView[]): boolean {
  return triggers.some((t) => t.triggerType === "km");
}

export function triggersNeedOre(triggers: MaintenancePresetTriggerView[]): boolean {
  return triggers.length === 0 || triggers.some((t) => t.triggerType === "ore");
}

export function primaryIntervalFromTriggers(triggers: MaintenancePresetTriggerView[]): {
  intervalType: MaintenanceIntervalType;
  intervalValue: number;
  intervalOre: number;
} {
  const ore = triggers.find((t) => t.triggerType === "ore");
  if (ore) return { intervalType: "ore", intervalValue: ore.threshold, intervalOre: ore.threshold };
  const km = triggers.find((t) => t.triggerType === "km");
  if (km) return { intervalType: "km", intervalValue: km.threshold, intervalOre: km.threshold };
  const first = triggers[0];
  if (first) {
    return {
      intervalType: first.triggerType,
      intervalValue: first.threshold,
      intervalOre: first.triggerType === "ore" ? first.threshold : 500,
    };
  }
  return { intervalType: "ore", intervalValue: 500, intervalOre: 500 };
}

export function defaultDualTriggers(kind: "ore_mesi" | "km_mesi"): MaintenancePresetTriggerView[] {
  if (kind === "km_mesi") {
    return [
      { triggerType: "km", threshold: 15000, priority: 0 },
      { triggerType: "mesi", threshold: 12, priority: 1 },
    ];
  }
  return [
    { triggerType: "ore", threshold: 500, priority: 0 },
    { triggerType: "mesi", threshold: 12, priority: 1 },
  ];
}
