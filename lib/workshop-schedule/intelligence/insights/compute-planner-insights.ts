import { computeDayCapacity, DEFAULT_DAY_BOUNDS, type DayBounds } from "@/lib/workshop-schedule/day-capacity";
import { sessionDurationMinutes, ymdFromIso } from "@/lib/workshop-schedule/datetime";
import type { WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";
import type { PlannerInsight } from "@/lib/workshop-schedule/intelligence/insights/types";

const GAP_THRESHOLD_MIN = 120;
const FRAGMENTATION_THRESHOLD = 4;

export function insightsMemoKey(sessionFingerprint: string, boundsKey: string): string {
  return `${sessionFingerprint}|${boundsKey}`;
}

export function computePlannerInsights(
  sessions: readonly WorkshopScheduleSessionView[],
  activeDates: readonly string[],
  bounds: DayBounds = DEFAULT_DAY_BOUNDS,
  nowMs: number = Date.now(),
): PlannerInsight[] {
  const insights: PlannerInsight[] = [];
  const active = sessions.filter((s) => s.planningStatus !== "cancelled");

  // Daily saturation / overload
  for (const date of activeDates) {
    const daySessions = active.filter((s) => ymdFromIso(s.startAt) === date || ymdFromIso(s.endAt) === date);
    const cap = computeDayCapacity(date, daySessions, bounds);
    if (cap.saturationPct >= 90) {
      insights.push({
        type: "overload",
        severity: cap.saturationPct >= 100 ? "high" : "medium",
        message: `Saturazione elevata il ${date}: ${cap.saturationPct}%`,
        relatedDates: [date],
      });
    }
  }

  // Avg utilization
  const saturations = activeDates.map((d) => {
    const daySessions = active.filter((s) => ymdFromIso(s.startAt) === d || ymdFromIso(s.endAt) === d);
    return computeDayCapacity(d, daySessions, bounds).saturationPct;
  });
  const avgUtil = saturations.length ? Math.round(saturations.reduce((a, b) => a + b, 0) / saturations.length) : 0;
  if (avgUtil < 40 && active.length > 0) {
    insights.push({
      type: "optimization",
      severity: "low",
      message: `Utilizzo medio officina basso (${avgUtil}%) — margine per anticipare interventi`,
      relatedDates: [...activeDates],
    });
  } else if (avgUtil > 85) {
    insights.push({
      type: "overload",
      severity: "high",
      message: `Utilizzo medio officina elevato (${avgUtil}%)`,
      relatedDates: [...activeDates],
    });
  }

  // Fragmentation + dead time per work order
  const byWo = new Map<string, WorkshopScheduleSessionView[]>();
  for (const s of active) {
    if (!s.workOrderId) continue;
    const list = byWo.get(s.workOrderId) ?? [];
    list.push(s);
    byWo.set(s.workOrderId, list);
  }

  for (const [woId, group] of byWo) {
    const sorted = [...group].sort((a, b) => a.startAt.localeCompare(b.startAt));
    if (sorted.length >= FRAGMENTATION_THRESHOLD) {
      insights.push({
        type: "inefficiency",
        severity: sorted.length >= 6 ? "high" : "medium",
        message: `Lavorazione frammentata in ${sorted.length} sessioni`,
        relatedWorkOrders: [woId],
      });
    }

    for (let i = 1; i < sorted.length; i++) {
      const gapMin = sessionDurationMinutes(sorted[i - 1].endAt, sorted[i].startAt);
      if (gapMin >= GAP_THRESHOLD_MIN) {
        insights.push({
          type: "gap",
          severity: gapMin >= 24 * 60 ? "high" : "medium",
          message: `Tempo morto di ${Math.round(gapMin / 60)}h tra sessioni della stessa lavorazione`,
          relatedWorkOrders: [woId],
          relatedDates: [ymdFromIso(sorted[i].startAt)],
        });
      }
    }
  }

  // Delays vs planning_status
  for (const s of active) {
    if (s.planningStatus !== "scheduled" && s.planningStatus !== "confirmed") continue;
    const endMs = Date.parse(s.endAt);
    if (endMs < nowMs && s.planningStatus === "scheduled") {
      insights.push({
        type: "inefficiency",
        severity: "medium",
        message: `Sessione "${s.title}" ancora "da pianificare" ma già trascorsa`,
        relatedWorkOrders: s.workOrderId ? [s.workOrderId] : undefined,
        relatedDates: [ymdFromIso(s.startAt)],
      });
    }
  }

  return insights.sort((a, b) => {
    const sev = { high: 0, medium: 1, low: 2 };
    return sev[a.severity] - sev[b.severity];
  });
}
