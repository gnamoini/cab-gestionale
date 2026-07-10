import type { ControlDefinition } from "./types";
import { CONTROL_REGISTRY } from "./registry";

export class ControlGraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ControlGraphError";
  }
}

export function validateControlGraph(controls: readonly ControlDefinition[] = CONTROL_REGISTRY): void {
  const ids = new Set(controls.map((c) => c.id));
  for (const control of controls) {
    for (const dep of control.dependsOn ?? []) {
      if (!ids.has(dep)) {
        throw new ControlGraphError(`Control ${control.id} depends on missing control ${dep}`);
      }
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new ControlGraphError(`Cycle detected involving ${id}`);
    }
    visiting.add(id);
    const control = controls.find((c) => c.id === id);
    for (const dep of control?.dependsOn ?? []) dfs(dep);
    visiting.delete(id);
    visited.add(id);
  }

  for (const control of controls) dfs(control.id);
}

/** Topological order — dependencies first (only edges within `controls` affect order). */
export function sortControlsByDependencies(
  controls: readonly ControlDefinition[],
): ControlDefinition[] {
  validateControlGraph(CONTROL_REGISTRY);
  const ids = new Set(controls.map((c) => c.id));
  const byId = new Map(controls.map((c) => [c.id, c]));
  const visited = new Set<string>();
  const order: ControlDefinition[] = [];

  function visit(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);
    const c = byId.get(id);
    if (!c) return;
    for (const dep of c.dependsOn ?? []) {
      if (ids.has(dep)) visit(dep);
    }
    order.push(c);
  }

  for (const c of controls) visit(c.id);
  return order;
}
