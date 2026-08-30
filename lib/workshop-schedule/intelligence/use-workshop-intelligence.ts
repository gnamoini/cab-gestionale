import { useMemo } from "react";
import { computeDayCapacity, DEFAULT_DAY_BOUNDS, type DayBounds } from "@/lib/workshop-schedule/day-capacity";
import { ymdFromIso } from "@/lib/workshop-schedule/datetime";
import { buildGanttRowsByWorkOrder } from "@/lib/workshop-schedule/intelligence/gantt/gantt-row-by-workorder";
import { buildGanttTimeAxis } from "@/lib/workshop-schedule/intelligence/gantt/gantt-time-axis";
import { computeHeatmapCells, heatmapMemoKey } from "@/lib/workshop-schedule/intelligence/heatmap/compute-heatmap";
import { planAutoSchedule } from "@/lib/workshop-schedule/intelligence/auto-scheduler/plan-auto-schedule";
import type { AutoScheduleInput } from "@/lib/workshop-schedule/intelligence/auto-scheduler/types";
import { computePlannerInsights, insightsMemoKey } from "@/lib/workshop-schedule/intelligence/insights/compute-planner-insights";
import {
  computeWeeklyLoad,
  sessionsFingerprint,
  weeklyLoadMemoKey,
} from "@/lib/workshop-schedule/intelligence/weekly-load/compute-weekly-load";
import type { WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";

export type WorkshopIntelligenceInput = {
  sessions: readonly WorkshopScheduleSessionView[];
  rangeStartYmd: string;
  rangeEndYmd: string;
  weekStartYmd: string;
  heatmapDates: readonly string[];
  bounds?: DayBounds;
  invalidationKey: string;
  enabled?: boolean;
};

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return ymdFromIso(d.toISOString());
}

export function useWorkshopScheduleIntelligence(input: WorkshopIntelligenceInput) {
  const enabled = input.enabled !== false;
  const sessions = useMemo(
    () => (enabled ? input.sessions : []),
    [enabled, input.sessions],
  );
  const bounds = input.bounds ?? DEFAULT_DAY_BOUNDS;
  const fingerprint = sessionsFingerprint([...sessions]);
  const invalidationKey = input.invalidationKey;

  const gantt = useMemo(() => {
    const axis = buildGanttTimeAxis(input.rangeStartYmd, input.rangeEndYmd, bounds);
    const rows = buildGanttRowsByWorkOrder(sessions);
    return { axis, rows };
  }, [sessions, input.rangeStartYmd, input.rangeEndYmd, bounds]);

  const heatmap = useMemo(() => {
    void invalidationKey;
    const key = heatmapMemoKey(input.heatmapDates, bounds);
    void key;
    return computeHeatmapCells(sessions, input.heatmapDates, bounds);
  }, [sessions, input.heatmapDates, bounds, invalidationKey]);

  const weeklyLoad = useMemo(() => {
    void invalidationKey;
    const cacheKey = weeklyLoadMemoKey(input.weekStartYmd, fingerprint);
    return computeWeeklyLoad(sessions, input.weekStartYmd, bounds, cacheKey);
  }, [sessions, input.weekStartYmd, bounds, fingerprint, invalidationKey]);

  const insights = useMemo(() => {
    void invalidationKey;
    const dates =
      input.heatmapDates.length > 0
        ? [...input.heatmapDates]
        : Array.from({ length: 7 }, (_, i) => addDaysYmd(input.weekStartYmd, i));
    const key = insightsMemoKey(fingerprint, `${bounds.startHour}-${bounds.endHour}`);
    void key;
    return computePlannerInsights(sessions, dates, bounds);
  }, [sessions, input.heatmapDates, input.weekStartYmd, bounds, fingerprint, invalidationKey]);

  const planAutoScheduleFor = useMemo(
    () => (autoInput: Omit<AutoScheduleInput, "existingSessions" | "dayCapacityByYmd">) => {
      if (!enabled) return null;
      const dayCapacityByYmd = new Map(
        autoInput.searchDaysYmd.map((d) => [
          d,
          computeDayCapacity(
            d,
            sessions.filter((s) => ymdFromIso(s.startAt) === d || ymdFromIso(s.endAt) === d),
            bounds,
          ),
        ]),
      );
      return planAutoSchedule({
        ...autoInput,
        existingSessions: sessions,
        dayCapacityByYmd,
        bounds,
      });
    },
    [sessions, bounds, enabled],
  );

  return { gantt, heatmap, weeklyLoad, insights, planAutoScheduleFor };
}
