import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { resolveCanonicalMetricId } from "@/lib/report/metrics/resolve-metric-id";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";

export type ReportDatasetId = "lavorazioni" | "magazzino" | "economico" | "ore" | "clienti";

export type DatasetPermission = {
  page: GestionalePageKey;
  level: "read";
};

export type DatasetAccessPolicy = {
  dataset: ReportDatasetId;
  route: string;
  requiredPermissions: DatasetPermission[];
  optionalPermissions?: DatasetPermission[];
};

export const DATASET_ACCESS_POLICIES: Record<ReportDatasetId, DatasetAccessPolicy> = {
  lavorazioni: {
    dataset: "lavorazioni",
    route: "/api/report/lavorazioni",
    requiredPermissions: [{ page: "lavorazioni", level: "read" }],
  },
  magazzino: {
    dataset: "magazzino",
    route: "/api/report/magazzino",
    requiredPermissions: [{ page: "magazzino", level: "read" }],
  },
  economico: {
    dataset: "economico",
    route: "/api/report/economico",
    requiredPermissions: [{ page: "fatturazione", level: "read" }],
  },
  ore: {
    dataset: "ore",
    route: "/api/report/ore",
    requiredPermissions: [{ page: "dipendenti", level: "read" }],
  },
  clienti: {
    dataset: "clienti",
    route: "/api/report/clienti",
    requiredPermissions: [{ page: "mezzi", level: "read" }],
    optionalPermissions: [{ page: "lavorazioni", level: "read" }],
  },
};

export function getDatasetAccessPolicy(dataset: ReportDatasetId): DatasetAccessPolicy {
  return DATASET_ACCESS_POLICIES[dataset];
}

export function checkDatasetAccess(
  policy: DatasetAccessPolicy,
  readablePages: ReadonlySet<GestionalePageKey>,
): { ok: boolean; missing: GestionalePageKey[]; optionalGranted: GestionalePageKey[] } {
  const missing: GestionalePageKey[] = [];
  for (const perm of policy.requiredPermissions) {
    if (!readablePages.has(perm.page)) missing.push(perm.page);
  }
  const optionalGranted: GestionalePageKey[] = [];
  for (const perm of policy.optionalPermissions ?? []) {
    if (readablePages.has(perm.page)) optionalGranted.push(perm.page);
  }
  return { ok: missing.length === 0, missing, optionalGranted };
}

export function canonicalMetricIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => resolveCanonicalMetricId(id)))];
}

export function assertCanonicalMetricsRegistered(ids: string[]): void {
  for (const id of ids) {
    const canonical = resolveCanonicalMetricId(id);
    if (canonical !== id) {
      throw new Error(`Metric id must be canonical: ${id} → use ${canonical}`);
    }
    const entry = getRegistryEntry(canonical);
    if (!entry) throw new Error(`Metric not in registry: ${canonical}`);
  }
}
