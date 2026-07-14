import { isWeekendLocal } from "@/lib/dipendenti/dipendenti-presenze-reminder";

export const FATTURE_SCADUTE_DIGEST_HOUR = 9;
export const FATTURE_SCADUTE_DIGEST_MINUTE = 0;

function isAtOrAfterDigestTime(
  date: Date,
  hour: number,
  minute: number,
): boolean {
  if (date.getHours() > hour) return true;
  if (date.getHours() < hour) return false;
  return date.getMinutes() >= minute;
}

export function shouldRunFattureScaduteDigestCheck(now: Date = new Date()): boolean {
  if (isWeekendLocal(now)) return false;
  return isAtOrAfterDigestTime(now, FATTURE_SCADUTE_DIGEST_HOUR, FATTURE_SCADUTE_DIGEST_MINUTE);
}
