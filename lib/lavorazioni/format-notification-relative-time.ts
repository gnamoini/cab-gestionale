const rtf = new Intl.RelativeTimeFormat("it", { numeric: "auto" });

function toRelativeUnit(diffMs: number): { value: number; unit: Intl.RelativeTimeFormatUnit } {
  const abs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < minute) return { value: Math.round(diffMs / 1000), unit: "second" };
  if (abs < hour) return { value: Math.round(diffMs / minute), unit: "minute" };
  if (abs < day) return { value: Math.round(diffMs / hour), unit: "hour" };
  return { value: Math.round(diffMs / day), unit: "day" };
}

/** Etichetta relativa italiana, es. "5 minuti fa". */
export function formatNotificationRelativeTime(iso: string, nowMs = Date.now()): string {
  const raw = iso?.trim();
  if (!raw) return "";
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return "";
  const diffMs = t - nowMs;
  const { value, unit } = toRelativeUnit(diffMs);
  return rtf.format(value, unit);
}
