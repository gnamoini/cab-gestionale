import { entryToCellValue, isCellEmpty } from "@/lib/dipendenti/timesheet-totals";
import { todayDateYmd } from "@/lib/dipendenti/timesheet-month";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import type { DipendentiPresenzeReminderNotification } from "@/lib/notifications/admin-dashboard-notifications";

export const DIPENDENTI_PRESENZE_REMINDER_HOUR = 17;
export const DIPENDENTI_PRESENZE_REMINDER_MINUTE = 0;

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

export function hasAnyPresenzeRecorded(entries: readonly DipendenteTimesheetEntryRow[]): boolean {
  for (const entry of entries) {
    if (!isCellEmpty(entryToCellValue(entry))) return true;
  }
  return false;
}

export function dipendentiPresenzeReminderStoreKey(dateYmd: string): string {
  return `dip-presenze:${dateYmd}`;
}

export function buildDipendentiPresenzeReminderNotification(
  dateYmd: string = todayDateYmd(),
): DipendentiPresenzeReminderNotification {
  return {
    kind: "dipendenti_presenze_reminder",
    id: dipendentiPresenzeReminderStoreKey(dateYmd),
    dateYmd,
    createdAt: new Date().toISOString(),
  };
}

export const DIPENDENTI_PRESENZE_REMINDER_TOAST =
  "Presenze dipendenti: non risultano ore inserite per oggi. Apri la tabella e completa le presenze.";

export const DIPENDENTI_PRESENZE_REMINDER_DESKTOP_TITLE = "Presenze dipendenti da inserire";

export function formatDipendentiPresenzeReminderDesktopBody(dateYmd: string): string {
  const [y, m, d] = dateYmd.split("-");
  return `Nessuna presenza registrata per il ${d}/${m}/${y}. Apri Dipendenti per completare la tabella.`;
}
