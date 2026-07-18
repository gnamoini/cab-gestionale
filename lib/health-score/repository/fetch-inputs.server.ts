import "server-only";

import { APP_SETTINGS_COLUMNS, DIPENDENTI_TIMESHEET_ENTRIES_COLUMNS } from "@/lib/db/table-select-columns";
import { fetchInvoiceListPayload } from "@/lib/fatturazione/fatturazione-fetch";
import {
  getControlTowerHealthScoreDataFetchRange,
  getControlTowerLast30DaysRange,
  getControlTowerPrevious30DaysRange,
} from "@/lib/dashboard/control-tower-time-ranges";
import { fetchLavorazioniListRows } from "@/lib/lavorazioni/lavorazioni-list-fetch";
import { LAVORAZIONI_REPORT_FILTERS } from "@/lib/lavorazioni/lavorazioni-prefetch-filters";
import { fetchMagazzinoListRows } from "@/lib/magazzino/magazzino-list-fetch";
import { mapMagazzinoRowsToUI } from "@/lib/magazzino/magazzino-list-cache";
import { fetchMovimentiListRows } from "@/lib/movimenti/movimenti-list-fetch";
import {
  fetchPreventiviListRows,
  mapPreventiviEmbedRowsToRecords,
} from "@/lib/preventivi/preventivi-list-fetch";
import { movimentiRowsToMagazzinoChangeLog } from "@/lib/report/report-movimenti-log";
import { filterMovimentiForReport } from "@/lib/report/report-truth-dataset";
import { buildInputSnapshot } from "@/lib/health-score/repository/input-snapshot.server";
import type { InputSnapshot } from "@/lib/health-score/types";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { resolveCabAppSettingsFromRows } from "@/src/lib/app-settings/resolve-from-rows";
import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";
import type { AppSettingRow } from "@/src/types/supabase-tables";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { InvoiceRow } from "@/src/types/supabase-tables";
import { ymdFromDate, type DateRange } from "@/lib/report/date-ranges";

export type HealthScoreRawData = {
  lavRows: LavorazioneListRow[];
  ricambi: RicambioMagazzino[];
  magLog: MagazzinoChangeLogEntry[];
  timesheetEntries: DipendenteTimesheetEntryRow[];
  tipiAssenza: readonly TipoAssenzaConfig[];
  statiLavorazione: StatoLavorazioneConfig[];
  preventivi: PreventivoRecord[];
  invoices: InvoiceRow[];
  dipendentiAttivi: number;
  mezziCount: number;
};

export type HealthScoreFetchResult = {
  snapshot: InputSnapshot;
  anchor: Date;
  range: ReturnType<typeof getControlTowerLast30DaysRange>;
  prevRange: ReturnType<typeof getControlTowerPrevious30DaysRange>;
};

export async function fetchHealthScoreRawDataServer(fetchRange: DateRange): Promise<HealthScoreRawData> {
  const sb = createSupabaseServerServiceClient();
  const timesheetFrom = ymdFromDate(fetchRange.start);
  const timesheetTo = ymdFromDate(fetchRange.end);

  const settingsRes = await sb
    .from("app_settings")
    .select(APP_SETTINGS_COLUMNS)
    .order("module")
    .order("key");
  const settingsRows = (settingsRes.data ?? []) as AppSettingRow[];
  const resolved = resolveCabAppSettingsFromRows(settingsRows, null);
  const sanitizeStati = resolved.lavorazioni.stati;

  const [lavRes, magRes, movRes, preventiviRes, invoicesRes, timesheetRes, dipendentiRes, mezziRes] =
    await Promise.all([
      fetchLavorazioniListRows(sb, LAVORAZIONI_REPORT_FILTERS, { sanitizeStati }),
      fetchMagazzinoListRows(sb, { variant: "report" }),
      fetchMovimentiListRows(sb),
      fetchPreventiviListRows(sb),
      fetchInvoiceListPayload(sb),
      sb
        .from("dipendenti_timesheet_entries")
        .select(DIPENDENTI_TIMESHEET_ENTRIES_COLUMNS)
        .gte("work_date", timesheetFrom)
        .lte("work_date", timesheetTo),
      sb.from("dipendenti_timesheet_employees").select("id", { count: "exact", head: true }),
      sb.from("mezzi").select("id", { count: "exact", head: true }),
    ]);

  const lavRows = lavRes.success ? (lavRes.data ?? []) : [];
  const magRows = magRes.success ? (magRes.data ?? []) : [];
  const ricambi = mapMagazzinoRowsToUI(magRows, "Sistema", resolved.mezziListe);
  const movimentiRows = movRes.success ? (movRes.data ?? []) : [];
  const validRicambioIds = new Set(ricambi.map((r) => r.id));
  const validLavorazioneIds = new Set(lavRows.map((r) => r.id));
  const { rows: filteredMov } = filterMovimentiForReport(movimentiRows, validRicambioIds, validLavorazioneIds);
  const magLog = movimentiRowsToMagazzinoChangeLog(filteredMov);

  const preventivi = preventiviRes.success
    ? mapPreventiviEmbedRowsToRecords(preventiviRes.data ?? [])
    : [];
  const invoices = invoicesRes.success ? (invoicesRes.data?.invoices ?? []) : [];

  return {
    lavRows,
    ricambi,
    magLog,
    timesheetEntries: (timesheetRes.data ?? []) as DipendenteTimesheetEntryRow[],
    tipiAssenza: resolved.dipendenti.tipiAssenza,
    statiLavorazione: resolved.lavorazioni.stati,
    preventivi,
    invoices,
    dipendentiAttivi: dipendentiRes.count ?? 0,
    mezziCount: mezziRes.count ?? 0,
  };
}

export async function fetchHealthScoreInputsServer(anchor = new Date()): Promise<HealthScoreFetchResult> {
  const range = getControlTowerLast30DaysRange(anchor);
  const prevRange = getControlTowerPrevious30DaysRange(anchor);
  const fetchRange = getControlTowerHealthScoreDataFetchRange(anchor);
  const raw = await fetchHealthScoreRawDataServer(fetchRange);

  const snapshot = buildInputSnapshot({
    ...raw,
    range,
    prevRange,
    anchor,
  });

  return { snapshot, anchor, range, prevRange };
}
