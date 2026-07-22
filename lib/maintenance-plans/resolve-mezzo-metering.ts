import type { MaintenanceIntervalType } from "@/lib/maintenance-plans/maintenance-enums";

export type MeteringConfidence = "high" | "medium" | "low";

export type MezzoMetering = {
  ore: number;
  km: number | null;
  source: "asset_mileage" | "mezzo_meta" | "hybrid";
  confidence: MeteringConfidence;
};

export function resolveMezzoMeteringFromMeta(input: {
  oreKm: number | null | undefined;
  kmFromMeta?: number | null;
}): MezzoMetering {
  const ore = input.oreKm ?? 0;
  const km = input.kmFromMeta ?? null;
  return { ore, km, source: "mezzo_meta", confidence: km != null ? "medium" : "low" };
}

export function resolveMezzoMeteringHybrid(input: {
  oreKm: number | null | undefined;
  kmFromMeta?: number | null;
  latestAssetKm: number | null;
  assetLifecycleActive: boolean;
}): MezzoMetering {
  const ore = input.oreKm ?? 0;
  if (input.assetLifecycleActive && input.latestAssetKm != null) {
    return { ore, km: input.latestAssetKm, source: "asset_mileage", confidence: "high" };
  }
  const km = input.kmFromMeta ?? input.latestAssetKm ?? null;
  const source = km != null && input.latestAssetKm != null ? "hybrid" : "mezzo_meta";
  return {
    ore,
    km,
    source,
    confidence: source === "hybrid" ? "medium" : ore > 0 || km != null ? "medium" : "low",
  };
}

export function currentValueForInterval(
  intervalType: MaintenanceIntervalType,
  metering: MezzoMetering,
): number {
  switch (intervalType) {
    case "km":
      return metering.km ?? 0;
    case "giorni":
    case "mesi":
      return 0;
    case "ore":
    default:
      return metering.ore;
  }
}

export function formatIntervalLabel(intervalType: MaintenanceIntervalType, intervalValue: number): string {
  switch (intervalType) {
    case "km":
      return `${intervalValue} km`;
    case "giorni":
      return `${intervalValue} giorni`;
    case "mesi":
      return `${intervalValue} mesi`;
    case "ore":
    default:
      return `${intervalValue} ore`;
  }
}

export function groupOverviewByInterval<T extends { intervalType: MaintenanceIntervalType; intervalValue: number }>(
  rows: T[],
): { key: string; intervalType: MaintenanceIntervalType; intervalValue: number; rows: T[] }[] {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = `${row.intervalType}:${row.intervalValue}`;
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([key, groupRows]) => ({
      key,
      intervalType: groupRows[0]!.intervalType,
      intervalValue: groupRows[0]!.intervalValue,
      rows: groupRows,
    }))
    .sort((a, b) => {
      if (a.intervalType !== b.intervalType) return a.intervalType.localeCompare(b.intervalType);
      return a.intervalValue - b.intervalValue;
    });
}

const NO_PRESET_GROUP_KEY = "__no_preset__";

export function groupOverviewByPreset<T extends { presetId: string | null; presetNome: string }>(
  rows: T[],
): { key: string; presetId: string | null; presetNome: string; rows: T[] }[] {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.presetId ?? NO_PRESET_GROUP_KEY;
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([key, groupRows]) => ({
      key,
      presetId: key === NO_PRESET_GROUP_KEY ? null : key,
      presetNome: groupRows[0]?.presetNome ?? "Senza preset",
      rows: groupRows,
    }))
    .sort((a, b) => {
      if (a.presetId === null) return 1;
      if (b.presetId === null) return -1;
      return a.presetNome.localeCompare(b.presetNome, "it");
    });
}

export function sortOverviewByNextDue<T extends {
  nextDateEstimated: string | null;
  remainingValue: number | null;
}>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const dateA = a.nextDateEstimated;
    const dateB = b.nextDateEstimated;
    if (dateA && dateB) return dateA.localeCompare(dateB);
    if (dateA) return -1;
    if (dateB) return 1;
    const remA = a.remainingValue ?? Number.POSITIVE_INFINITY;
    const remB = b.remainingValue ?? Number.POSITIVE_INFINITY;
    return remA - remB;
  });
}
