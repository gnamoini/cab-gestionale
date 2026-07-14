import type { HealthSectionDefinition } from "@/lib/health-score/registry/types";

const registry = new Map<string, HealthSectionDefinition>();

export function registerHealthSection(def: HealthSectionDefinition): void {
  if (registry.has(def.id)) {
    throw new Error(`Health section already registered: ${def.id}`);
  }
  registry.set(def.id, def);
}

export function getHealthSection(id: string): HealthSectionDefinition | undefined {
  return registry.get(id);
}

export function getAllHealthSections(): HealthSectionDefinition[] {
  return [...registry.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function clearHealthSectionRegistry(): void {
  registry.clear();
}
