import { computeDayCapacity, DEFAULT_DAY_BOUNDS, type DayBounds } from "@/lib/workshop-schedule/day-capacity";
import { ymdFromIso } from "@/lib/workshop-schedule/datetime";
import type { WorkshopScheduleSession } from "@/lib/workshop-schedule/types";
import type { WeeklyLoadSnapshot } from "@/lib/workshop-schedule/intelligence/weekly-load/types";

type SessionSlice = Pick<WorkshopScheduleSession, "startAt" | "endAt" | "eventType" | "planningStatus">;

const weeklyLoadCache = new Map<string, WeeklyLoadSnapshot>();

export function weeklyLoadMemoKey(weekStartYmd: string, sessionFingerprint: string): string {
  return `${weekStartYmd}|${sessionFingerprint}`;
}

export function clearWeeklyLoadCache(): void {
  weeklyLoadCache.clear();
}

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return ymdFromIso(d.toISOString());
}

function weekDates(weekStartYmd: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysYmd(weekStartYmd, i));
}

export function computeWeeklyLoad(
  sessions: readonly SessionSlice[],
  weekStartYmd: string,
  bounds: DayBounds = DEFAULT_DAY_BOUNDS,
  cacheKey?: string,
): WeeklyLoadSnapshot {
  if (cacheKey) {
    const cached = weeklyLoadCache.get(cacheKey);
    if (cached) return cached;
  }

  const dates = weekDates(weekStartYmd);
  const weekEnd = dates[dates.length - 1];
  const weekRange = `${weekStartYmd} — ${weekEnd}`;

  let totalPlannedMinutes = 0;
  const dailyBreakdown: WeeklyLoadSnapshot["dailyBreakdown"] = [];
  const bottlenecks: string[] = [];

  for (const date of dates) {
    const daySessions = sessions.filter(
      (s) => s.planningStatus !== "cancelled" && (ymdFromIso(s.startAt) === date || ymdFromIso(s.endAt) === date),
    );
    const cap = computeDayCapacity(date, daySessions, bounds);
    totalPlannedMinutes += cap.plannedMinutes;
    dailyBreakdown.push({ date, loadPct: cap.saturationPct });
    if (cap.saturationPct >= 90) {
      bottlenecks.push(`${date}: saturazione ${cap.saturationPct}%`);
    }
  }

  const snapshot: WeeklyLoadSnapshot = {
    weekRange,
    totalPlannedHours: Math.round((totalPlannedMinutes / 60) * 10) / 10,
    dailyBreakdown,
    bottlenecks,
  };

  if (cacheKey) weeklyLoadCache.set(cacheKey, snapshot);
  return snapshot;
}

export function sessionsFingerprint(sessions: readonly { id: string; updatedAt: string }[]): string {
  return sessions.map((s) => `${s.id}:${s.updatedAt}`).sort().join("|");
}
