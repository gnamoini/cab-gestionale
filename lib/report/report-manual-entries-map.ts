import type { ReportManualByMonth } from "@/lib/report/lavorazioni-report-selectors";
import type { ReportManualEntryRow } from "@/src/types/supabase-tables";

/** Dal go-live gestionale: mesi >= chiave usano solo archivio DB (no override Excel). */
export const REPORT_LAVORAZIONI_LIVE_FROM_MONTH = "2026-07";

export function isReportLavorazioniLiveMonth(monthKey: string): boolean {
  const mk = monthKey.trim().slice(0, 7);
  return mk.length === 7 && mk >= REPORT_LAVORAZIONI_LIVE_FROM_MONTH;
}

/** Override manuale ammesso solo prima del cutover live. */
export function canReportManualMonthOverride(monthKey: string): boolean {
  return !isReportLavorazioniLiveMonth(monthKey);
}

/** `period_month` ISO date → chiave `YYYY-MM`. */
export function periodMonthToKey(periodMonth: string): string {
  return periodMonth.trim().slice(0, 7);
}

export function manualEntriesToByMonth(entries: readonly ReportManualEntryRow[]): ReportManualByMonth {
  const map: ReportManualByMonth = new Map();
  for (const e of entries) {
    if (e.deleted_at) continue;
    map.set(periodMonthToKey(e.period_month), e.completed_count);
  }
  return map;
}

/** Primo giorno del mese corrente (locale). */
export function startOfCurrentMonthLocal(anchor: Date = new Date()): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0);
}

/** Solo mesi strictly precedenti al mese corrente. */
export function isPastReportMonth(periodMonthYmd: string, anchor: Date = new Date()): boolean {
  const d = new Date(`${periodMonthYmd.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < startOfCurrentMonthLocal(anchor).getTime();
}

/** Mesi passati e mese corrente editabili; futuri no. */
export function isAllowedReportManualMonth(periodMonthYmd: string, anchor: Date = new Date()): boolean {
  const d = new Date(`${periodMonthYmd.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
  return monthStart.getTime() <= startOfCurrentMonthLocal(anchor).getTime();
}

export function formatPeriodMonthLabel(periodMonthYmd: string): string {
  const d = new Date(`${periodMonthYmd.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return periodMonthYmd.slice(0, 7);
  return d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}
