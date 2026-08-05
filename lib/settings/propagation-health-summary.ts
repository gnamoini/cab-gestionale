import type { SettingsRenameKind } from "@/lib/settings/settings-rename-types";
import type { PropagationStatus } from "@/lib/settings/rename-engine/types";
import {
  buildPropagationDriftCabEvent,
  scanPropagationDrift,
  type PropagationDriftItem,
} from "@/lib/settings/propagation-drift-detector";
import type { SettingsRenameJobRow } from "@/src/services/settings-rename-job.service";

export type PropagationHealthKindSummary = {
  kind: SettingsRenameKind;
  label: string;
  status: "ok" | "pending" | "configuration_only" | "drift";
  driftCount: number;
  items: PropagationDriftItem[];
};

const KIND_LABELS: Partial<Record<SettingsRenameKind, string>> = {
  utilizzatore: "Utilizzatori",
  cliente: "Clienti",
  cantiere: "Cantieri",
};

const HEALTH_KINDS: SettingsRenameKind[] = ["utilizzatore", "cliente", "cantiere"];

export function summarizePropagationHealth(input: {
  catalogByKind: Partial<Record<SettingsRenameKind, readonly string[]>>;
  operationalByKind: Partial<Record<SettingsRenameKind, readonly string[]>>;
  pendingJobs: readonly SettingsRenameJobRow[];
}): PropagationHealthKindSummary[] {
  return HEALTH_KINDS.map((kind) => {
    const items = scanPropagationDrift({
      kind,
      catalogLabels: input.catalogByKind[kind] ?? [],
      operationalValues: input.operationalByKind[kind] ?? [],
      pendingJobs: input.pendingJobs,
    });
    const driftCount = items.reduce((s, i) => s + i.affectedCount, 0);
    let status: PropagationHealthKindSummary["status"] = "ok";
    if (items.some((i) => i.propagationStatus === "configuration_only")) status = "configuration_only";
    else if (items.some((i) => i.propagationStatus === "pending_propagation")) status = "pending";
    if (driftCount > 0 && status === "ok") status = "drift";
    return {
      kind,
      label: KIND_LABELS[kind] ?? kind,
      status,
      driftCount,
      items,
    };
  });
}

export function propagationStatusLabel(status: PropagationStatus): string {
  switch (status) {
    case "propagated":
      return "Propagato";
    case "configuration_only":
      return "Solo configurazione";
    default:
      return "Propagazione pendente";
  }
}

export { buildPropagationDriftCabEvent, scanPropagationDrift };
export type { PropagationDriftItem };
