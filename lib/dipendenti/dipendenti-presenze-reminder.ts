import { entryToCellValue, isCellEmpty } from "@/lib/dipendenti/timesheet-totals";
import { todayDateYmd } from "@/lib/dipendenti/timesheet-month";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
} from "@/lib/dipendenti/types";
import type { DipendentiPresenzeReminderNotification } from "@/lib/notifications/admin-dashboard-notifications";

export const DIPENDENTI_PRESENZE_REMINDER_HOUR = 17;
export const DIPENDENTI_PRESENZE_REMINDER_MINUTE = 0;

export type DipendentiPresenzeReminderPayload = {
  dateYmd: string;
  count: number;
  createdAt: string;
};

export function isWeekendLocal(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isAtOrAfterReminderTime(
  date: Date,
  hour = DIPENDENTI_PRESENZE_REMINDER_HOUR,
  minute = DIPENDENTI_PRESENZE_REMINDER_MINUTE,
): boolean {
  if (date.getHours() > hour) return true;
  if (date.getHours() < hour) return false;
  return date.getMinutes() >= minute;
}

export function shouldRunDipendentiPresenzeReminderCheck(now: Date = new Date()): boolean {
  if (isWeekendLocal(now)) return false;
  return isAtOrAfterReminderTime(now);
}

export function entryHasPresenzaRecorded(entry: DipendenteTimesheetEntryRow): boolean {
  return !isCellEmpty(entryToCellValue(entry));
}

export function hasAnyPresenzeRecorded(entries: readonly DipendenteTimesheetEntryRow[]): boolean {
  for (const entry of entries) {
    if (entryHasPresenzaRecorded(entry)) return true;
  }
  return false;
}

/** Dipendenti attivi in settings senza ore/assenza registrate per la data. */
export function countDipendentiSenzaPresenzeOggi(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  entries: readonly DipendenteTimesheetEntryRow[],
  dateYmd: string,
): number {
  const active = employees.filter((e) => e.in_settings);
  if (active.length === 0) return 0;

  const byDipendente = new Map<string, DipendenteTimesheetEntryRow>();
  for (const entry of entries) {
    if (entry.work_date === dateYmd) byDipendente.set(entry.dipendente_id, entry);
  }

  let missing = 0;
  for (const employee of active) {
    const entry = byDipendente.get(employee.id);
    if (!entry || !entryHasPresenzaRecorded(entry)) missing += 1;
  }
  return missing;
}

export function buildDipendentiPresenzeReminderPayload(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  entries: readonly DipendenteTimesheetEntryRow[],
  dateYmd: string = todayDateYmd(),
  now = new Date(),
): DipendentiPresenzeReminderPayload | null {
  const count = countDipendentiSenzaPresenzeOggi(employees, entries, dateYmd);
  if (count <= 0) return null;
  return { dateYmd, count, createdAt: now.toISOString() };
}

export function dipendentiPresenzeReminderStoreKey(dateYmd: string): string {
  return `dip-presenze:${dateYmd}`;
}

export function formatDipendentiPresenzeReminderBody(payload: DipendentiPresenzeReminderPayload): string {
  const n = payload.count;
  const label = n === 1 ? "dipendente" : "dipendenti";
  return `${n} ${label} senza presenze per oggi. Apri Dipendenti e completa la tabella ore.`;
}

export function formatDipendentiPresenzeReminderTitle(count: number): string {
  const label = count === 1 ? "dipendente" : "dipendenti";
  return `${count} ${label} senza presenze`;
}

export function buildDipendentiPresenzeReminderNotification(
  payload: DipendentiPresenzeReminderPayload,
): DipendentiPresenzeReminderNotification {
  return {
    kind: "dipendenti_presenze_reminder",
    id: dipendentiPresenzeReminderStoreKey(payload.dateYmd),
    dateYmd: payload.dateYmd,
    count: payload.count,
    createdAt: payload.createdAt,
  };
}

/** @deprecated Usare formatDipendentiPresenzeReminderBody. */
export const DIPENDENTI_PRESENZE_REMINDER_TOAST = formatDipendentiPresenzeReminderBody({
  dateYmd: todayDateYmd(),
  count: 1,
  createdAt: new Date().toISOString(),
});

export const DIPENDENTI_PRESENZE_REMINDER_DESKTOP_TITLE = "Presenze dipendenti da inserire";

export function formatDipendentiPresenzeReminderDesktopBody(
  payload: Pick<DipendentiPresenzeReminderPayload, "dateYmd" | "count">,
): string {
  return formatDipendentiPresenzeReminderBody({
    dateYmd: payload.dateYmd,
    count: payload.count,
    createdAt: new Date().toISOString(),
  });
}
