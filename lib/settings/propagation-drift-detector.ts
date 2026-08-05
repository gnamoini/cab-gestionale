import type { SettingsRenameKind } from "@/lib/settings/settings-rename-types";
import type { PropagationStatus } from "@/lib/settings/rename-engine/types";
import { settingsNormKey } from "@/lib/settings/settings-list-duplicate";
import type { SettingsRenameJobRow } from "@/src/services/settings-rename-job.service";

export type PropagationDriftItem = {
  kind: SettingsRenameKind;
  oldLabel: string;
  newLabel: string;
  affectedCount: number;
  jobId?: string;
  propagationStatus: PropagationStatus;
};

export type PropagationDriftScanInput = {
  kind: SettingsRenameKind;
  catalogLabels: readonly string[];
  operationalValues: readonly string[];
  pendingJobs: readonly SettingsRenameJobRow[];
};

const EMPTY_MARKERS = new Set(["", "—", "-"]);

function normOperational(value: string): string {
  return value.trim();
}

function isInCatalog(label: string, catalog: readonly string[]): boolean {
  const key = settingsNormKey(label);
  if (!key) return false;
  return catalog.some((c) => settingsNormKey(c) === key);
}

/** ponytail: O(n*m) scan — upgrade path: SQL DISTINCT + join su jobs se volumi crescono */
export function scanPropagationDrift(input: PropagationDriftScanInput): PropagationDriftItem[] {
  const catalog = input.catalogLabels;
  const operational = [
    ...new Set(
      input.operationalValues.map(normOperational).filter((v) => v && !EMPTY_MARKERS.has(v)),
    ),
  ];
  const out: PropagationDriftItem[] = [];

  for (const job of input.pendingJobs) {
    if (job.kind !== input.kind) continue;
    const status = job.propagation_status ?? "pending_propagation";
    if (status === "propagated") continue;
    const count = operational.filter((v) => settingsNormKey(v) === settingsNormKey(job.old_label)).length;
    if (count <= 0 && status !== "configuration_only") continue;
    if (!isInCatalog(job.new_label, catalog)) continue;
    out.push({
      kind: input.kind,
      oldLabel: job.old_label,
      newLabel: job.new_label,
      affectedCount: count,
      jobId: job.id,
      propagationStatus: status,
    });
  }

  for (const value of operational) {
    if (isInCatalog(value, catalog)) continue;
    const matchingJob = input.pendingJobs.find(
      (j) =>
        j.kind === input.kind &&
        settingsNormKey(j.old_label) === settingsNormKey(value) &&
        isInCatalog(j.new_label, catalog) &&
        j.propagation_status !== "propagated",
    );
    if (!matchingJob) continue;
    if (out.some((d) => d.jobId === matchingJob.id)) continue;
    out.push({
      kind: input.kind,
      oldLabel: matchingJob.old_label,
      newLabel: matchingJob.new_label,
      affectedCount: operational.filter((v) => settingsNormKey(v) === settingsNormKey(value)).length,
      jobId: matchingJob.id,
      propagationStatus: matchingJob.propagation_status ?? "configuration_only",
    });
  }

  return out;
}

export function buildPropagationDriftCabEvent(item: PropagationDriftItem) {
  return {
    type: "SETTINGS_PROPAGATION_DRIFT_DETECTED" as const,
    kind: item.kind,
    oldLabel: item.oldLabel,
    newLabel: item.newLabel,
    affectedCount: item.affectedCount,
    jobId: item.jobId,
  };
}
