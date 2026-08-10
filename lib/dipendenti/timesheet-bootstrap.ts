import {
  dipendenteDisplayName,
  type DipendenteRecord,
  type EmployeeType,
} from "@/lib/dipendenti/dipendente-record";
import type { DipendenteTimesheetEmployeeRow } from "@/lib/dipendenti/types";

export function normalizeEmployeeName(name: string): string {
  return name.trim().toLowerCase();
}

export type BootstrapInsertCandidate = {
  displayName: string;
  sourceAddettoId: string;
  sourceAddettoName: string;
  employeeType: EmployeeType;
  attivo: boolean;
  inSettings: boolean;
};

export type BootstrapSettingsUpdate = {
  id: string;
  inSettings: boolean;
};

export type BootstrapDisplayUpdate = {
  id: string;
  displayName: string;
};

export type BootstrapMirrorUpdate = {
  id: string;
  employeeType: EmployeeType;
  attivo: boolean;
  inSettings: boolean;
};

export type BootstrapPlan = {
  inserts: BootstrapInsertCandidate[];
  settingsUpdates: BootstrapSettingsUpdate[];
  displayUpdates: BootstrapDisplayUpdate[];
  mirrorUpdates: BootstrapMirrorUpdate[];
};

/**
 * Piano bootstrap: sync per source_addetto_id = DipendenteRecord.id.
 * in_settings = attivo (presente in anagrafica attiva).
 */
export function planEmployeeBootstrap(
  existing: readonly DipendenteTimesheetEmployeeRow[],
  dipendentiRecords: readonly DipendenteRecord[],
): BootstrapPlan {
  const anagraficaIds = new Set(dipendentiRecords.map((r) => r.id));
  const inserts: BootstrapInsertCandidate[] = [];
  const displayUpdates: BootstrapDisplayUpdate[] = [];
  const mirrorUpdates: BootstrapMirrorUpdate[] = [];

  const settingsById = new Map<string, boolean>();

  const byAddettoId = new Map<string, DipendenteTimesheetEmployeeRow>();
  const byNameNorm = new Map<string, DipendenteTimesheetEmployeeRow>();
  for (const row of existing) {
    if (row.source_addetto_id) {
      byAddettoId.set(row.source_addetto_id, row);
    }
    byNameNorm.set(normalizeEmployeeName(row.display_name), row);
  }

  for (const rec of dipendentiRecords) {
    const displayName = dipendenteDisplayName(rec);
    const inSettings = rec.attivo;
    const matched =
      byAddettoId.get(rec.id) ??
      byNameNorm.get(normalizeEmployeeName(rec.nome)) ??
      byNameNorm.get(normalizeEmployeeName(displayName));
    if (!matched) {
      inserts.push({
        displayName,
        sourceAddettoId: rec.id,
        sourceAddettoName: rec.nome,
        employeeType: rec.employeeType,
        attivo: rec.attivo,
        inSettings,
      });
      continue;
    }
    settingsById.set(matched.id, inSettings);
    const mirrorChanged =
      matched.employee_type !== rec.employeeType ||
      matched.attivo !== rec.attivo ||
      matched.in_settings !== inSettings;
    if (mirrorChanged) {
      mirrorUpdates.push({
        id: matched.id,
        employeeType: rec.employeeType,
        attivo: rec.attivo,
        inSettings,
      });
    }
    if (rec.attivo && matched.display_name !== displayName) {
      displayUpdates.push({ id: matched.id, displayName });
    }
  }

  for (const row of existing) {
    if (!row.source_addetto_id || anagraficaIds.has(row.source_addetto_id)) continue;
    const inSettings = false;
    settingsById.set(row.id, inSettings);
    if (row.in_settings !== inSettings) {
      mirrorUpdates.push({
        id: row.id,
        employeeType: row.employee_type,
        attivo: row.attivo,
        inSettings,
      });
    }
  }

  const settingsUpdates = Array.from(settingsById.entries())
    .map(([id, inSettings]) => {
      const row = existing.find((r) => r.id === id);
      if (row && row.in_settings === inSettings) return null;
      return { id, inSettings };
    })
    .filter((x): x is BootstrapSettingsUpdate => x !== null);

  const dedupedMirror = new Map<string, BootstrapMirrorUpdate>();
  for (const m of mirrorUpdates) {
    dedupedMirror.set(m.id, m);
  }

  return {
    inserts,
    settingsUpdates,
    displayUpdates,
    mirrorUpdates: [...dedupedMirror.values()],
  };
}
