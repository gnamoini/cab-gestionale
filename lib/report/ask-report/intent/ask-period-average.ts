export function wantsWeeklyAverage(message: string): boolean {
  return /\bmedia\s+settimanal/i.test(message);
}

export function wantsDailyAverage(message: string): boolean {
  return /\bmedia\s+giornalier/i.test(message);
}

export type AskPeriodAverageKind = "weekly" | "daily";

export function resolvePeriodAverageKind(message: string): AskPeriodAverageKind | null {
  if (wantsWeeklyAverage(message)) return "weekly";
  if (wantsDailyAverage(message)) return "daily";
  return null;
}
