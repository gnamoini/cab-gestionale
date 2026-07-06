import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { addettoDisplayName } from "@/lib/lavorazioni/addetto-model";
import type { DipendenteTimesheetEmployeeRow } from "@/lib/dipendenti/types";

export function normalizeEmployeeName(name: string): string {
  return name.trim().toLowerCase();
}

export type BootstrapInsertCandidate = {
  displayName: string;
  sourceAddettoId: string;
  sourceAddettoName: string;
};

export type BootstrapSettingsUpdate = {
  id: string;
  inSettings: boolean;
};

export type BootstrapDisplayUpdate = {
  id: string;
  displayName: string;
};

export type BootstrapPlan = {
  inserts: BootstrapInsertCandidate[];
  settingsUpdates: BootstrapSettingsUpdate[];
  displayUpdates: BootstrapDisplayUpdate[];
};

/**
 * Piano bootstrap insert-only: sync per source_addetto_id + fallback nome legacy.
 */
export function planEmployeeBootstrap(
  existing: readonly DipendenteTimesheetEmployeeRow[],
  addettiRecords: readonly AddettoRecord[],
): BootstrapPlan {
  const settingsIds = new Set<string>();
  const inserts: BootstrapInsertCandidate[] = [];
  const displayUpdates: BootstrapDisplayUpdate[] = [];

  const settingsById = new Map<string, boolean>();

  for (const rec of addettiRecords) {
    settingsIds.add(rec.id);
  }

  const byAddettoId = new Map<string, DipendenteTimesheetEmployeeRow>();
  const byNameNorm = new Map<string, DipendenteTimesheetEmployeeRow>();
  for (const row of existing) {
    if (row.source_addetto_id) {
      byAddettoId.set(row.source_addetto_id, row);
    }
    byNameNorm.set(normalizeEmployeeName(row.display_name), row);
  }

  for (const rec of addettiRecords) {
    const displayName = addettoDisplayName(rec);
    const matched =
      byAddettoId.get(rec.id) ??
      byNameNorm.get(normalizeEmployeeName(rec.nome)) ??
      byNameNorm.get(normalizeEmployeeName(displayName));
    if (!matched) {
      inserts.push({
        displayName,
        sourceAddettoId: rec.id,
        sourceAddettoName: rec.nome,
      });
      continue;
    }
    settingsById.set(matched.id, true);
    if (matched.in_settings && matched.display_name !== displayName) {
      displayUpdates.push({ id: matched.id, displayName });
    }
  }

  for (const row of existing) {
    const inSettings = row.source_addetto_id ? settingsIds.has(row.source_addetto_id) : false;
    settingsById.set(row.id, inSettings);
  }

  const settingsUpdates = Array.from(settingsById.entries()).map(([id, inSettings]) => {
    const row = existing.find((r) => r.id === id);
    if (row && row.in_settings === inSettings) return null;
    return { id, inSettings };
  }).filter((x): x is BootstrapSettingsUpdate => x !== null);

  return { inserts, settingsUpdates, displayUpdates };
}
