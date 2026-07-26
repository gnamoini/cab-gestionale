import type { MaintenanceTask } from "@/lib/maintenance-plans/maintenance-task";
import type { RigaRicambioScheda, SchedaRicambiFields } from "@/types/schede";

function taskId(kind: string, key: string): string {
  return `${kind}:${key}`;
}

export function ricambiRowsToExecutedTasks(righe: RigaRicambioScheda[]): MaintenanceTask[] {
  return righe
    .filter((r) => r.ricambioId || r.ricambioNome?.trim())
    .map((r) => ({
      id: taskId("ricambio", r.ricambioId ?? r.id),
      kind: "ricambio" as const,
      label: r.ricambioNome?.trim() || r.codice?.trim() || "Ricambio",
      isRequired: false,
      ricambioId: r.ricambioId ?? undefined,
      qtyActual: Number(r.quantita) || 0,
    }));
}

export function parseSchedaRicambiContenuto(contenuto: unknown): SchedaRicambiFields | null {
  if (!contenuto || typeof contenuto !== "object") return null;
  const root = contenuto as Record<string, unknown>;
  const doc = (root.doc ?? root) as Record<string, unknown>;
  const campi = (doc.campi ?? doc) as Record<string, unknown>;
  const righe = Array.isArray(campi.righe) ? (campi.righe as RigaRicambioScheda[]) : [];
  return {
    identificazioneMacchina: String(campi.identificazioneMacchina ?? ""),
    righe,
  };
}

export function executedTasksFromSchedaRicambiContenuto(contenuto: unknown): MaintenanceTask[] {
  const fields = parseSchedaRicambiContenuto(contenuto);
  if (!fields) return [];
  return ricambiRowsToExecutedTasks(fields.righe);
}

export function checklistExecutedTasks(
  items: { label: string; checked: boolean; isRequired?: boolean }[],
): MaintenanceTask[] {
  return items.map((item, idx) => ({
    id: taskId("checklist", `idx-${idx}`),
    kind: "checklist" as const,
    label: item.label,
    isRequired: item.isRequired ?? true,
    checked: item.checked,
  }));
}
