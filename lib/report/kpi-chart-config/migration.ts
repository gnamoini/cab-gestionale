import { kpiChartsStorageKey, loadKpiChartConfigs } from "@/lib/report/report-kpi-chart-persistence";
import type { SavedKpiChart } from "@/lib/report/kpi-chart-config/contracts";
import { savedKpiChartToConfigBody } from "@/lib/report/kpi-chart-config/mapper";
import type { CreateSavedKpiChartInput } from "@/lib/report/kpi-chart-config/contracts";
import { KPI_CHART_CONFIG_SCHEMA_VERSION } from "@/lib/report/kpi-chart-config/contracts";

const MIGRATED_FLAG_PREFIX = "gestionale.report.kpi-charts.migrated.v1";

function migratedFlagKey(userId: string): string {
  return `${MIGRATED_FLAG_PREFIX}:${userId}`;
}

export function readLocalKpiCharts(userId: string): SavedKpiChart[] {
  return loadKpiChartConfigs(userId).map((c) => ({
    ...c,
    schemaVersion: KPI_CHART_CONFIG_SCHEMA_VERSION,
    createdAt: c.updatedAt,
  }));
}

export function shouldMigrateLocal(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(migratedFlagKey(userId)) !== "1";
  } catch {
    return false;
  }
}

export function markLocalMigrationDone(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(migratedFlagKey(userId), "1");
    window.localStorage.removeItem(kpiChartsStorageKey(userId));
  } catch {
    /* quota / private mode */
  }
}

export function localChartsToCreateInputs(charts: SavedKpiChart[]): CreateSavedKpiChartInput[] {
  return charts.map((c) => ({
    id: c.id,
    name: c.name,
    config: savedKpiChartToConfigBody(c),
  }));
}

export function canAutoImportLocal(dbChartCount: number, localCharts: SavedKpiChart[]): boolean {
  return dbChartCount === 0 && localCharts.length > 0;
}
