/** Espansione date per promemoria ricorrenti (occorrenze materializzate). */

export type PromemoriaRecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type PromemoriaRecurrenceScope = "single" | "following" | "series";

export const PROMEMORIA_RECURRENCE_MAX_OCCURRENCES = 366;
export const PROMEMORIA_RECURRENCE_MAX_YEARS_AHEAD = 3;

export const PROMEMORIA_RECURRENCE_FREQUENCY_LABELS: Record<PromemoriaRecurrenceFrequency, string> = {
  daily: "Giornaliero",
  weekly: "Settimanale",
  monthly: "Mensile",
  yearly: "Annuale",
};

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return { y, m: mo, d };
}

export function formatYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function addDays(y: number, m: number, d: number, days: number): string {
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  dt.setDate(dt.getDate() + days);
  return formatYmd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

/** Avanza di `interval` mesi mantenendo il giorno o l'ultimo del mese se assente. */
function addMonthsAnchor(y: number, m: number, anchorDay: number, monthSteps: number): string {
  const totalMonths = (y * 12 + (m - 1)) + monthSteps;
  const ny = Math.floor(totalMonths / 12);
  const nm = (totalMonths % 12) + 1;
  const nd = Math.min(anchorDay, lastDayOfMonth(ny, nm));
  return formatYmd(ny, nm, nd);
}

function addYearsAnchor(y: number, m: number, d: number, yearSteps: number): string {
  const ny = y + yearSteps;
  const nd = Math.min(d, lastDayOfMonth(ny, m));
  return formatYmd(ny, m, nd);
}

export function maxRecurrenceUntilYmd(startYmd: string): string {
  const start = parseYmd(startYmd);
  if (!start) return startYmd;
  return formatYmd(start.y + PROMEMORIA_RECURRENCE_MAX_YEARS_AHEAD, start.m, start.d);
}

export type RecurrenceValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateRecurrenceInput(
  startYmd: string,
  frequency: PromemoriaRecurrenceFrequency | null | undefined,
  interval: number,
  untilYmd: string,
  enabled: boolean,
): RecurrenceValidationResult {
  if (!enabled) return { ok: true };
  if (!frequency) return { ok: false, message: "Seleziona la frequenza di ripetizione." };
  if (!Number.isFinite(interval) || interval < 1 || interval > 99) {
    return { ok: false, message: "Intervallo di ripetizione non valido." };
  }
  const start = parseYmd(startYmd);
  const until = parseYmd(untilYmd);
  if (!start) return { ok: false, message: "Data iniziale non valida." };
  if (!until) return { ok: false, message: "Seleziona la data di fine ripetizione." };
  if (untilYmd < startYmd) {
    return { ok: false, message: "La data di fine deve essere uguale o successiva alla data iniziale." };
  }
  const maxUntil = maxRecurrenceUntilYmd(startYmd);
  if (untilYmd > maxUntil) {
    return { ok: false, message: `La serie non può superare ${PROMEMORIA_RECURRENCE_MAX_YEARS_AHEAD} anni dalla data iniziale.` };
  }
  const dates = expandRecurrenceOccurrences(startYmd, frequency, interval, untilYmd);
  if (dates.length === 0) return { ok: false, message: "Nessuna occorrenza nel periodo selezionato." };
  if (dates.length > PROMEMORIA_RECURRENCE_MAX_OCCURRENCES) {
    return {
      ok: false,
      message: `Troppe occorrenze (max ${PROMEMORIA_RECURRENCE_MAX_OCCURRENCES}). Accorcia il periodo o aumenta l'intervallo.`,
    };
  }
  return { ok: true };
}

function occurrenceYmdAtIndex(
  start: { y: number; m: number; d: number },
  frequency: PromemoriaRecurrenceFrequency,
  step: number,
  index: number,
): string {
  const mult = index * step;
  switch (frequency) {
    case "daily":
      return addDays(start.y, start.m, start.d, mult);
    case "weekly":
      return addDays(start.y, start.m, start.d, mult * 7);
    case "monthly":
      return addMonthsAnchor(start.y, start.m, start.d, mult);
    case "yearly":
      return addYearsAnchor(start.y, start.m, start.d, mult);
    default:
      return formatYmd(start.y, start.m, start.d);
  }
}

export function expandRecurrenceOccurrences(
  startYmd: string,
  frequency: PromemoriaRecurrenceFrequency,
  interval: number,
  untilYmd: string,
): string[] {
  const start = parseYmd(startYmd);
  const until = parseYmd(untilYmd);
  if (!start || !until || untilYmd < startYmd) return [];
  const step = Math.max(1, Math.floor(interval));
  const out: string[] = [];

  for (let index = 0; index < PROMEMORIA_RECURRENCE_MAX_OCCURRENCES; index += 1) {
    const current = occurrenceYmdAtIndex(start, frequency, step, index);
    if (current > untilYmd) break;
    out.push(current);
  }

  return out;
}

export function formatRecurrenceSummary(
  frequency: PromemoriaRecurrenceFrequency | null | undefined,
  interval: number | null | undefined,
  untilYmd: string | null | undefined,
): string | null {
  if (!frequency) return null;
  const label = PROMEMORIA_RECURRENCE_FREQUENCY_LABELS[frequency];
  const n = interval && interval > 1 ? interval : 1;
  const every =
    n === 1
      ? label.toLowerCase()
      : `ogni ${n} ${frequency === "daily" ? "giorni" : frequency === "weekly" ? "settimane" : frequency === "monthly" ? "mesi" : "anni"}`;
  const until = untilYmd?.trim();
  return until ? `Ripete ${every} fino al ${until}` : `Ripete ${every}`;
}

export function isPromemoriaSeriesMember(
  row: { series_id: string | null },
): boolean {
  return row.series_id != null && row.series_id.length > 0;
}
