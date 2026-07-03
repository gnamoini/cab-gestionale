const ROME_TZ = "Europe/Rome";

export function sessionDurationMinutes(startAt: string, endAt: string): number {
  return Math.max(0, Math.round((Date.parse(endAt) - Date.parse(startAt)) / 60_000));
}

export function ymdFromIso(iso: string, timeZone = ROME_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

export function localTimeLabel(iso: string, timeZone = ROME_TZ): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function localDateTimeLabel(iso: string, timeZone = ROME_TZ): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** ponytail: v1 reject cross-midnight in local TZ without explicit split */
export function spansMultipleLocalDays(startAt: string, endAt: string, timeZone = ROME_TZ): boolean {
  return ymdFromIso(startAt, timeZone) !== ymdFromIso(endAt, timeZone);
}

export function buildDayBoundsIso(ymd: string, startHour: number, endHour: number): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = new Date(`${ymd}T${pad(startHour)}:00:00`);
  const end = new Date(`${ymd}T${pad(endHour)}:00:00`);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function parseAgendaDateParam(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}
