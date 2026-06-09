import { monthKeyFromDate, parseMonthKey } from "@/lib/dipendenti/timesheet-month";
import type { TimesheetMonthKey } from "@/lib/dipendenti/types";

/** Mesi distinti (YYYY-MM) da date giornaliere con entry salvate. */
export function monthKeysFromEntryWorkDates(dates: readonly string[]): TimesheetMonthKey[] {
  const set = new Set<TimesheetMonthKey>();
  for (const raw of dates) {
    const d = raw.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    set.add(d.slice(0, 7) as TimesheetMonthKey);
  }
  return [...set].sort((a, b) => b.localeCompare(a));
}

/** Anni distinti con almeno un mese con dati, più recenti prima. */
export function yearsFromMonthKeys(monthKeys: readonly TimesheetMonthKey[]): number[] {
  const set = new Set<number>();
  for (const key of monthKeys) {
    set.add(parseMonthKey(key).year);
  }
  return [...set].sort((a, b) => b - a);
}

/**
 * Opzioni anno per GlobalSelect: solo anni con tabelle popolate,
 * più l'anno del mese selezionato (navigazione / Oggi).
 */
export function buildTimesheetYearSelectOptions(
  monthKeysWithData: readonly TimesheetMonthKey[],
  selectedYear: number,
): { value: number; label: string }[] {
  const years = new Set(yearsFromMonthKeys(monthKeysWithData));
  years.add(selectedYear);
  return [...years]
    .sort((a, b) => b - a)
    .map((y) => ({ value: y, label: String(y) }));
}

/** Mese predefinito se l'anno corrente non ha ancora dati. */
export function defaultMonthKeyForEmptyState(anchor: Date = new Date()): TimesheetMonthKey {
  return monthKeyFromDate(anchor);
}
