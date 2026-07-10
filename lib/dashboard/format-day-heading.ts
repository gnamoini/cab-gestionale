/** Intestazione giorno calendario/dashboard (ymd → "lunedì 9 luglio 2026"). */
export function formatDayHeading(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  return date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
