import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type {
  AddettiEmployeeMappingRow,
  SchedaLavorazioneRow,
} from "@/src/types/supabase-tables";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
} from "@/lib/dipendenti/types";
import type { LavorazioneSchedeStore } from "@/types/schede";
import type { DateRange } from "@/lib/report/date-ranges";
import {
  getEmployeeUtilization,
  getEstimateVsActualDelta,
  getPresenceHours,
  hoursIntegrityCheck,
  sumActualLaborHoursInRange,
} from "@/lib/analytics/hours";

export type AnalisiOreOfficinaPayload = {
  presenceHours: ReturnType<typeof getPresenceHours>;
  actualLaborHoursTotal: number;
  utilization: ReturnType<typeof getEmployeeUtilization>;
  estimateVsActual: ReturnType<typeof getEstimateVsActualDelta>;
  integrity: ReturnType<typeof hoursIntegrityCheck>;
};

export function buildAnalisiOreOfficinaPayload(input: {
  range: DateRange;
  completate: readonly LavorazioneArchiviata[];
  lavListRows: readonly LavorazioneListRow[];
  schedeStore: LavorazioneSchedeStore | null;
  schedeInterventiRows: readonly Pick<SchedaLavorazioneRow, "lavorazione_id" | "contenuto">[];
  timesheetEntries: readonly DipendenteTimesheetEntryRow[];
  timesheetEmployees: readonly DipendenteTimesheetEmployeeRow[];
  mappings: readonly AddettiEmployeeMappingRow[];
  preventivi: readonly PreventivoRecord[];
}): AnalisiOreOfficinaPayload {
  const presenceHours = getPresenceHours(input.timesheetEntries, input.range);
  const actualLaborHoursTotal = sumActualLaborHoursInRange(
    input.completate,
    input.range,
    input.lavListRows,
  );

  const utilization = getEmployeeUtilization({
    range: input.range,
    employees: input.timesheetEmployees,
    timesheetEntries: input.timesheetEntries,
    completate: input.completate,
    schedeStore: input.schedeStore,
    mappings: input.mappings,
  });

  const estimateVsActual = getEstimateVsActualDelta(input.preventivi, input.lavListRows);

  const integrity = hoursIntegrityCheck({
    lavorazioni: input.lavListRows,
    schedeInterventi: input.schedeInterventiRows,
    mappings: input.mappings,
  });

  return {
    presenceHours,
    actualLaborHoursTotal,
    utilization,
    estimateVsActual,
    integrity,
  };
}
