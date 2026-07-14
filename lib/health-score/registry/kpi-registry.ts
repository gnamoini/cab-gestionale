import type { HealthKpiDefinition } from "@/lib/health-score/registry/types";

const registry = new Map<string, HealthKpiDefinition>();

export function registerHealthKpi(def: HealthKpiDefinition): void {
  if (registry.has(def.id)) {
    throw new Error(`Health KPI already registered: ${def.id}`);
  }
  registry.set(def.id, def);
}

export function getHealthKpi(id: string): HealthKpiDefinition | undefined {
  return registry.get(id);
}

/** Deterministic order by id. */
export function getAllHealthKpis(): HealthKpiDefinition[] {
  return [...registry.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function getHealthKpisForSection(sectionId: string): HealthKpiDefinition[] {
  return getAllHealthKpis().filter((k) => k.sectionId === sectionId);
}

/** Test helper — reset registry between tests. */
export function clearHealthKpiRegistry(): void {
  registry.clear();
}
