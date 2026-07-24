import { getPresenceHours } from "@/lib/analytics/hours/get-presence-hours";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
} from "@/lib/dipendenti/types";
import { entryToCellValue } from "@/lib/dipendenti/timesheet-totals";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore } from "@/types/schede";
import type { AddettiEmployeeMappingRow } from "@/src/types/supabase-tables";
import type { EmployeeUtilizationResult } from "@/lib/analytics/hours/types";
import {
  buildAddettiEmployeeMappingIndex,
  resolveEmployeeIdFromMapping,
} from "@/lib/analytics/hours/resolve-employee-from-mapping";

type UtilizationInput = {
  range: DateRange;
  employees: readonly DipendenteTimesheetEmployeeRow[];
  timesheetEntries: readonly DipendenteTimesheetEntryRow[];
  completate: readonly LavorazioneArchiviata[];
  schedeStore: LavorazioneSchedeStore | null;
  mappings: readonly AddettiEmployeeMappingRow[];
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function getEmployeeUtilization(input: UtilizationInput): EmployeeUtilizationResult {
  const mappingIndex = buildAddettiEmployeeMappingIndex(input.mappings);
  const employeeName = new Map(input.employees.map((e) => [e.id, e.display_name]));
  const presenceByEmployee = new Map<string, number>();
  const actualByEmployee = new Map<string, number>();
  const jobsByEmployee = new Map<string, Set<string>>();

  for (const entry of input.timesheetEntries) {
    if (!isoInRange(entry.work_date, input.range)) continue;
    const cell = entryToCellValue(entry);
    const worked = cell.oreOrdinarie + cell.oreStraordinarie;
    if (worked <= 0) continue;
    presenceByEmployee.set(
      entry.dipendente_id,
      round1((presenceByEmployee.get(entry.dipendente_id) ?? 0) + worked),
    );
  }

  let unmappedHours = 0;
  const unmappedAddetti = new Set<string>();

  for (const lav of input.completate) {
    if (!lav.dataCompletamento || !isoInRange(lav.dataCompletamento, input.range)) continue;
    const doc = input.schedeStore?.[lav.id]?.lavorazioni;
    if (!doc || doc.tipo !== "lavorazioni") continue;

    const mappedOnJob = new Set<string>();
    for (const riga of doc.campi.righe ?? []) {
      for (const a of riga.addettiAssegnati ?? []) {
        const ore = Number.isFinite(a.oreImpiegate) ? a.oreImpiegate : 0;
        if (ore <= 0) continue;
        const employeeId = resolveEmployeeIdFromMapping(a.addetto, mappingIndex);
        if (!employeeId) {
          unmappedHours = round1(unmappedHours + ore);
          const nome = a.addetto.trim();
          if (nome) unmappedAddetti.add(nome);
          continue;
        }
        actualByEmployee.set(employeeId, round1((actualByEmployee.get(employeeId) ?? 0) + ore));
        mappedOnJob.add(employeeId);
      }
    }
    for (const employeeId of mappedOnJob) {
      const set = jobsByEmployee.get(employeeId) ?? new Set<string>();
      set.add(lav.id);
      jobsByEmployee.set(employeeId, set);
    }
  }

  const employeeIds = new Set<string>([...presenceByEmployee.keys(), ...actualByEmployee.keys()]);

  const rows = [...employeeIds].map((employeeId) => {
    const presenceHours = presenceByEmployee.get(employeeId) ?? 0;
    const actualLaborHours = actualByEmployee.get(employeeId) ?? 0;
    const utilizationPct =
      presenceHours > 0 ? round1((actualLaborHours / presenceHours) * 100) : null;
    return {
      employeeId,
      employeeName: employeeName.get(employeeId) ?? employeeId,
      presenceHours,
      actualLaborHours,
      utilizationPct,
      completedJobs: jobsByEmployee.get(employeeId)?.size ?? 0,
    };
  });

  rows.sort(
    (a, b) => b.actualLaborHours - a.actualLaborHours || a.employeeName.localeCompare(b.employeeName, "it"),
  );

  void getPresenceHours(input.timesheetEntries, input.range);

  return {
    rows,
    unmappedHours: round1(unmappedHours),
    unmappedAddetti: [...unmappedAddetti].sort((a, b) => a.localeCompare(b, "it")),
  };
}
