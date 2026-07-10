import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { DateRange } from "@/lib/report/date-ranges";
import type { KpiSeriesGranularity } from "@/lib/report/metrics/report-metric-types";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { InvoiceRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type KpiSeriesBuildContext = {
  range: DateRange;
  bucket: KpiSeriesGranularity;
  attive: LavorazioneAttiva[];
  storico: LavorazioneArchiviata[];
  completate: LavorazioneArchiviata[];
  manualByMonth?: Map<string, number>;
  magLog: MagazzinoChangeLogEntry[];
  prodotti: RicambioMagazzino[];
  invoices?: readonly InvoiceRow[];
  timesheetEntries?: readonly DipendenteTimesheetEntryRow[];
  schedeStore?: LavorazioneSchedeStore | null;
  magazzinoRows?: readonly MagazzinoRicambioRow[];
  costoOrario?: number;
};

export type KpiSeriesProvider = (
  metricId: string,
  ctx: KpiSeriesBuildContext,
) => import("@/lib/report/kpi-series/contracts/kpi-series-contract").KpiSeries;
