import {
  isAtOrAfterReminderTime,
  isWeekendLocal,
} from "@/lib/dipendenti/dipendenti-presenze-reminder";

export const LAVORAZIONI_RITARDO_DIGEST_HOUR = 8;
export const LAVORAZIONI_RITARDO_DIGEST_MINUTE = 0;

export const FATTURE_SCADUTE_DIGEST_HOUR = 9;
export const FATTURE_SCADUTE_DIGEST_MINUTE = 0;

export function shouldRunLavorazioniRitardoDigestCheck(now: Date = new Date()): boolean {
  if (isWeekendLocal(now)) return false;
  return isAtOrAfterReminderTime(now, LAVORAZIONI_RITARDO_DIGEST_HOUR, LAVORAZIONI_RITARDO_DIGEST_MINUTE);
}

export function shouldRunFattureScaduteDigestCheck(now: Date = new Date()): boolean {
  if (isWeekendLocal(now)) return false;
  return isAtOrAfterReminderTime(now, FATTURE_SCADUTE_DIGEST_HOUR, FATTURE_SCADUTE_DIGEST_MINUTE);
}
