import type { ReportPeriodPreset } from "@/lib/report/date-ranges";
import type { NormalizationConfig } from "@/lib/report/kpi-series/normalize";

const STORAGE_KEY_PREFIX = "gestionale.report.kpi-charts.v1";

export type SavedKpiChartConfig = {
  id: string;
  name: string;
  metricIds: string[];
  preset: ReportPeriodPreset;
  customFrom: string;
  customTo: string;
  displayMode: "indexed" | "absolute";
  normalization: NormalizationConfig;
  updatedAt: string;
};

export type KpiChartsStorageV1 = {
  schemaVersion: 1;
  configs: SavedKpiChartConfig[];
};

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

function isValidYmd(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseNormalization(raw: unknown): NormalizationConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const mode = o.mode === "indexed" || o.mode === "absolute" ? o.mode : null;
  const baseline =
    o.baseline === "first-visible-point" || o.baseline === "first-period" ? o.baseline : null;
  const missing = o.missing === "ignore" || o.missing === "zero" ? o.missing : null;
  if (!mode || !baseline || !missing) return null;
  return { mode, baseline, missing };
}

function parseConfig(raw: unknown): SavedKpiChartConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  if (!Array.isArray(o.metricIds) || !o.metricIds.every((x) => typeof x === "string")) return null;
  if (typeof o.preset !== "string") return null;
  const normalization = parseNormalization(o.normalization);
  if (!normalization) return null;
  const displayMode = o.displayMode === "indexed" || o.displayMode === "absolute" ? o.displayMode : null;
  if (!displayMode) return null;
  return {
    id: o.id,
    name: o.name,
    metricIds: o.metricIds,
    preset: o.preset as ReportPeriodPreset,
    customFrom: isValidYmd(o.customFrom) ? o.customFrom : "",
    customTo: isValidYmd(o.customTo) ? o.customTo : "",
    displayMode,
    normalization,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
  };
}

export function parseKpiChartsStorage(raw: unknown): KpiChartsStorageV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schemaVersion !== 1) return null;
  if (!Array.isArray(o.configs)) return null;
  const configs: SavedKpiChartConfig[] = [];
  for (const item of o.configs) {
    const cfg = parseConfig(item);
    if (cfg) configs.push(cfg);
  }
  return { schemaVersion: 1, configs };
}

export function loadKpiChartConfigs(userId: string | null): SavedKpiChartConfig[] {
  if (!userId || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = parseKpiChartsStorage(JSON.parse(raw));
    return parsed?.configs ?? [];
  } catch {
    return [];
  }
}

/** @deprecated Scrittura localStorage — usare reportSavedKpiChartsService. Parser ancora usato per migrazione. */
export function saveKpiChartConfigs(userId: string | null, configs: SavedKpiChartConfig[]): void {
  if (!userId || typeof window === "undefined") return;
  const payload: KpiChartsStorageV1 = { schemaVersion: 1, configs };
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function upsertKpiChartConfig(
  userId: string | null,
  config: SavedKpiChartConfig,
): SavedKpiChartConfig[] {
  const existing = loadKpiChartConfigs(userId);
  const idx = existing.findIndex((c) => c.id === config.id);
  const next =
    idx >= 0
      ? existing.map((c, i) => (i === idx ? config : c))
      : [...existing, config];
  saveKpiChartConfigs(userId, next);
  return next;
}

export function deleteKpiChartConfig(userId: string | null, configId: string): SavedKpiChartConfig[] {
  const next = loadKpiChartConfigs(userId).filter((c) => c.id !== configId);
  saveKpiChartConfigs(userId, next);
  return next;
}

/** ponytail: stub per migrazione v2 futura */
export function migrateKpiChartsStorage(raw: unknown): KpiChartsStorageV1 | null {
  return parseKpiChartsStorage(raw);
}
