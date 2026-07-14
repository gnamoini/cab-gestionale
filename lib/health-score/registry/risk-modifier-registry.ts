import type { RiskModifierDefinition } from "@/lib/health-score/registry/types";

const registry = new Map<string, RiskModifierDefinition>();

export function registerRiskModifier(def: RiskModifierDefinition): void {
  if (registry.has(def.id)) {
    throw new Error(`Risk modifier already registered: ${def.id}`);
  }
  registry.set(def.id, def);
}

export function getAllRiskModifiers(): RiskModifierDefinition[] {
  return [...registry.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function clearRiskModifierRegistry(): void {
  registry.clear();
}
