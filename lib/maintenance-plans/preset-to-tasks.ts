import type { EffectivePart } from "@/lib/maintenance-plans/resolve-effective-preset";
import type { MaintenanceChecklistItemView } from "@/lib/maintenance-plans/types";
import type { MaintenanceTask } from "@/lib/maintenance-plans/maintenance-task";

function taskId(kind: string, key: string): string {
  return `${kind}:${key}`;
}

export function partsToMaintenanceTasks(parts: EffectivePart[]): MaintenanceTask[] {
  return parts.map((p) => ({
    id: taskId("ricambio", p.ricambioId),
    kind: "ricambio" as const,
    label: p.descrizione || p.codice,
    isRequired: p.isRequired,
    ricambioId: p.ricambioId,
    qtyExpected: p.quantita,
    replacementCondition: p.replacementCondition,
  }));
}

export function checklistToMaintenanceTasks(items: MaintenanceChecklistItemView[]): MaintenanceTask[] {
  return items.map((item, idx) => ({
    id: taskId("checklist", item.id ?? `idx-${idx}`),
    kind: "checklist" as const,
    label: item.label,
    isRequired: item.isRequired,
    checked: false,
  }));
}

export function mergeMaintenanceTasks(...groups: MaintenanceTask[][]): MaintenanceTask[] {
  const map = new Map<string, MaintenanceTask>();
  for (const group of groups) {
    for (const task of group) {
      map.set(task.id, task);
    }
  }
  return [...map.values()];
}

export function hashMaintenanceTasks(tasks: MaintenanceTask[]): string {
  const payload = tasks
    .map((t) => `${t.id}|${t.kind}|${t.label}|${t.qtyExpected ?? ""}|${t.isRequired}`)
    .sort()
    .join(";");
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash * 31 + payload.charCodeAt(i)) | 0;
  }
  return String(hash);
}
