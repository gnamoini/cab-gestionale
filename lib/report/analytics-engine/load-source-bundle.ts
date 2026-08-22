import "server-only";

import { fetchInvoiceListPayloadServer } from "@/lib/fatturazione/fatturazione-fetch-server";
import {
  fetchDipendentiEmployeesServer,
  fetchDipendentiEntriesForRangeServer,
} from "@/lib/dipendenti/dipendenti-timesheet-fetch-server";
import { fetchDdtListPayloadServer } from "@/lib/ddt/ddt-fetch-server";
import { fetchOrdiniFornitoriRecordsServer } from "@/lib/ordini-fornitori/ordine-fornitore-fetch-server";
import { entryToCellValue } from "@/lib/dipendenti/timesheet-totals";
import {
  enrichSlicesForDataset,
  loadBaseSlices,
} from "@/lib/report/datasets/api/report-dataset-api";
import { resolveDatasetDateRanges } from "@/lib/report/datasets/period";
import { ymdFromDate } from "@/lib/report/date-ranges";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";
import type { AnalyticsDataRequirements } from "@/lib/report/analytics-engine/resolve-analytics-data-requirements";
import { resolveSchedeConsumerScopesForMetrics } from "@/lib/report/analytics-engine/schede-requirements";
import { resolveSchedeLavorazioneIds } from "@/lib/report/schede-report-scope";
import { fetchSchedeBundlesStoreServer } from "@/lib/schede/schede-bundles-fetch-server";
import type { ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import { resolveCostoOrarioDefaultServer } from "@/lib/report/analytics-engine/load-settings-defaults";

function sumTimesheetHours(entries: { ore_ordinarie?: number | null; ore_straordinarie?: number | null }[]): number {
  let total = 0;
  for (const entry of entries) {
    const cell = entryToCellValue(entry as Parameters<typeof entryToCellValue>[0]);
    total += cell.oreOrdinarie + cell.oreStraordinarie;
  }
  return Math.round(total * 100) / 100;
}

export async function loadAnalyticsSourceBundle(
  period: ReportRequestedPeriod,
  requirements: AnalyticsDataRequirements,
): Promise<ReportAnalyticsSourceBundle> {
  const loadedSlices = new Set<keyof AnalyticsDataRequirements>();
  loadedSlices.add("metricIds");

  const base = await loadBaseSlices(period);
  const { range, compareRange, compareMode } = resolveDatasetDateRanges({ period });

  let preventivi = base.preventivi ?? [];
  let invoices = base.invoices ?? [];
  let invoicePayments: import("@/src/types/supabase-tables").InvoicePaymentRow[] = [];
  let ddtDocuments = base.ddtDocuments ?? [];
  let totalHours = base.totalHours ?? 0;
  let timesheetEntries: import("@/lib/dipendenti/types").DipendenteTimesheetEntryRow[] = [];
  let timesheetEmployees: import("@/lib/dipendenti/types").DipendenteTimesheetEmployeeRow[] = [];
  let schedeStore: import("@/types/schede").LavorazioneSchedeStore | null = null;
  let costoOrario = 48;
  let invoicesAvailable = base.invoicesAvailable ?? false;
  let ddtAvailable = false;
  let ordiniAvailable = false;
  let ordini = base.ordini ?? [];

  if (requirements.preventivi || requirements.invoices || requirements.invoicePayments) {
    loadedSlices.add("preventivi");
    loadedSlices.add("invoices");
    loadedSlices.add("invoicePayments");
    const eco = await enrichSlicesForDataset("economico", base);
    preventivi = eco.preventivi ?? [];
    invoices = eco.invoices ?? [];
    invoicesAvailable = eco.invoicesAvailable ?? false;
    const invPayload = await fetchInvoiceListPayloadServer();
    if (invPayload.success && invPayload.data) {
      invoicePayments = invPayload.data.payments ?? [];
    }
  }

  if (requirements.ddt) {
    loadedSlices.add("ddt");
    const ddtRes = await fetchDdtListPayloadServer();
    if (ddtRes.success && ddtRes.data) {
      ddtDocuments = ddtRes.data.documents ?? [];
      ddtAvailable = true;
    }
  }

  if (requirements.timesheet) {
    loadedSlices.add("timesheet");
    const [entriesRes, employeesRes] = await Promise.all([
      fetchDipendentiEntriesForRangeServer(ymdFromDate(range.start), ymdFromDate(range.end)),
      fetchDipendentiEmployeesServer(),
    ]);
    timesheetEntries = entriesRes.success ? (entriesRes.data ?? []) : [];
    timesheetEmployees = employeesRes.success ? (employeesRes.data ?? []) : [];
    totalHours = entriesRes.success ? sumTimesheetHours(timesheetEntries) : 0;
  }

  if (requirements.schede) {
    loadedSlices.add("schede");
    const scopes = resolveSchedeConsumerScopesForMetrics(requirements.metricIds);
    const ids = resolveSchedeLavorazioneIds(
      {
        completate: base.integrity.completate,
        lavListRows: base.lavRows,
        range,
      },
      scopes,
    );
    if (ids.length > 0) {
      const res = await fetchSchedeBundlesStoreServer(ids);
      schedeStore = res.success ? (res.data ?? null) : null;
    }
    costoOrario = await resolveCostoOrarioDefaultServer();
  }

  if (requirements.ordini) {
    loadedSlices.add("ordini");
    const ordiniRes = await fetchOrdiniFornitoriRecordsServer();
    if (ordiniRes.success && ordiniRes.data) {
      ordini = ordiniRes.data;
      ordiniAvailable = true;
    }
  }

  return {
    period,
    range,
    compareRange,
    compareMode,
    rangeKey: base.rangeKey,
    requirements,
    integrity: base.integrity,
    lavRows: base.lavRows,
    magazzinoRows: base.magazzinoRows,
    preventivi,
    invoices,
    invoicePayments,
    ddtDocuments,
    ordini,
    totalHours,
    timesheetEntries,
    timesheetEmployees,
    schedeStore,
    costoOrario,
    invoicesAvailable,
    ddtAvailable,
    ordiniAvailable,
    loadedSlices,
  };
}
