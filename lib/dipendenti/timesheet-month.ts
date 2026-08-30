import { formatPeriodMonthLabel } from "@/lib/report/report-manual-entries-map";
import type { TimesheetMonthKey } from "@/lib/dipendenti/types";

export function monthKeyFromDate(d: Date): TimesheetMonthKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseMonthKey(key: TimesheetMonthKey): { year: number; month: number } {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m };
}

export function monthKeyToFirstDay(key: TimesheetMonthKey): string {
  return `${key}-01`;
}

export function formatMonthLabel(key: TimesheetMonthKey): string {
  return formatPeriodMonthLabel(monthKeyToFirstDay(key));
}

export function daysInMonth(key: TimesheetMonthKey): number {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month, 0).getDate();
}

export type TimesheetDayInfo = {
  day: number;
  dateYmd: string;
  weekdayShort: string;
  weekdayLong: string;
  isWeekend: boolean;
};

const WEEKDAY_SHORT = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"] as const;
const WEEKDAY_LONG = [
  "domenica",
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
] as const;

export function buildMonthDays(key: TimesheetMonthKey): TimesheetDayInfo[] {
  const { year, month } = parseMonthKey(key);
  const count = daysInMonth(key);
  const out: TimesheetDayInfo[] = [];
  for (let day = 1; day <= count; day++) {
    const d = new Date(year, month - 1, day, 12, 0, 0, 0);
    const dow = d.getDay();
    const dateYmd = `${key}-${String(day).padStart(2, "0")}`;
    out.push({
      day,
      dateYmd,
      weekdayShort: WEEKDAY_SHORT[dow] ?? "",
      weekdayLong: WEEKDAY_LONG[dow] ?? "",
      isWeekend: dow === 0 || dow === 6,
    });
  }
  return out;
}

export function shiftMonthKey(key: TimesheetMonthKey, delta: number): TimesheetMonthKey {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 1 + delta, 1);
  return monthKeyFromDate(d);
}

export function monthOptions(count = 24, anchor: Date = new Date()): { value: TimesheetMonthKey; label: string }[] {
  const out: { value: TimesheetMonthKey; label: string }[] = [];
  const d = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  for (let i = 0; i < count; i++) {
    const key = monthKeyFromDate(d);
    out.push({ value: key, label: formatMonthLabel(key) });
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export function monthDateRange(key: TimesheetMonthKey): { from: string; to: string } {
  const from = monthKeyToFirstDay(key);
  const last = daysInMonth(key);
  const to = `${key}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export function monthKeyFromParts(year: number, month: number): TimesheetMonthKey {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function yearFromMonthKey(key: TimesheetMonthKey): number {
  return parseMonthKey(key).year;
}

export function yearDateRange(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

const MONTH_NAMES_IT = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
] as const;

export function yearOptions(count = 5, anchor: Date = new Date()): { value: number; label: string }[] {
  const startYear = anchor.getFullYear();
  const out: { value: number; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const y = startYear - i;
    out.push({ value: y, label: String(y) });
  }
  return out;
}

export function monthOptionsForYear(_year: number): { value: number; label: string }[] {
  void _year;
  return MONTH_NAMES_IT.map((label, i) => ({ value: i + 1, label }));
}

export function setMonthKeyParts(key: TimesheetMonthKey, year: number, month: number): TimesheetMonthKey {
  return monthKeyFromParts(year, month);
}

export type TimesheetPeriodMode = "day" | "week" | "month";

export function dateYmdFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayDateYmd(): string {
  return dateYmdFromDate(new Date());
}

export function currentMonthKey(): TimesheetMonthKey {
  return monthKeyFromDate(new Date());
}

export function isDateInMonthKey(dateYmd: string, monthKey: TimesheetMonthKey): boolean {
  return dateYmd.startsWith(`${monthKey}-`);
}

export function parseDateYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function weekRangeFromAnchor(anchorYmd: string): { from: string; to: string } {
  const d = parseDateYmd(anchorYmd);
  const dow = d.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: dateYmdFromDate(monday), to: dateYmdFromDate(sunday) };
}

export function dayRange(dayYmd: string): { from: string; to: string } {
  return { from: dayYmd, to: dayYmd };
}

export function resolvePeriodRange(
  periodMode: TimesheetPeriodMode,
  monthKey: TimesheetMonthKey,
  weekAnchor?: string,
  dayDate?: string,
): { from: string; to: string } {
  if (periodMode === "month") return monthDateRange(monthKey);
  if (periodMode === "week") {
    return weekRangeFromAnchor(weekAnchor ?? monthKeyToFirstDay(monthKey));
  }
  return dayRange(dayDate ?? monthKeyToFirstDay(monthKey));
}

export function buildPeriodDays(
  periodMode: TimesheetPeriodMode,
  monthKey: TimesheetMonthKey,
  weekAnchor?: string,
  dayDate?: string,
): TimesheetDayInfo[] {
  const { from, to } = resolvePeriodRange(periodMode, monthKey, weekAnchor, dayDate);
  const start = parseDateYmd(from);
  const end = parseDateYmd(to);
  const out: TimesheetDayInfo[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const dateYmd = dateYmdFromDate(cursor);
    const dow = cursor.getDay();
    out.push({
      day: cursor.getDate(),
      dateYmd,
      weekdayShort: WEEKDAY_SHORT[dow] ?? "",
      weekdayLong: WEEKDAY_LONG[dow] ?? "",
      isWeekend: dow === 0 || dow === 6,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function shiftWeekAnchor(anchorYmd: string, deltaWeeks: number): string {
  const d = parseDateYmd(anchorYmd);
  d.setDate(d.getDate() + deltaWeeks * 7);
  return dateYmdFromDate(d);
}

export function shiftDayDate(dayYmd: string, deltaDays: number): string {
  const d = parseDateYmd(dayYmd);
  d.setDate(d.getDate() + deltaDays);
  return dateYmdFromDate(d);
}

/** Giorni del mese che cadono nella settimana lun-dom ancorata a `weekAnchor`. */
export function filterMonthDaysByWeek(
  monthDays: readonly TimesheetDayInfo[],
  weekAnchor: string,
): TimesheetDayInfo[] {
  const { from, to } = weekRangeFromAnchor(weekAnchor);
  return monthDays.filter((d) => d.dateYmd >= from && d.dateYmd <= to);
}

/** `true` se spostare l'anchor di `delta` settimane lascia almeno un giorno nel mese. */
export function canShiftWeekAnchorInMonth(
  monthKey: TimesheetMonthKey,
  weekAnchor: string,
  deltaWeeks: number,
): boolean {
  const shifted = shiftWeekAnchor(weekAnchor, deltaWeeks);
  const monthDays = buildMonthDays(monthKey);
  return filterMonthDaysByWeek(monthDays, shifted).length > 0;
}

/** Anchor iniziale: oggi se nel mese, altrimenti primo giorno. */
export function resolveWeekAnchorForMonth(
  monthKey: TimesheetMonthKey,
  referenceDate: Date = new Date(),
): string {
  const today = dateYmdFromDate(referenceDate);
  return today.startsWith(`${monthKey}-`) ? today : monthKeyToFirstDay(monthKey);
}
