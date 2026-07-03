import { computeDayCapacity, DEFAULT_DAY_BOUNDS } from "@/lib/workshop-schedule/day-capacity";
import { defaultScheduleSuggestionEngine } from "@/lib/workshop-schedule/slot-suggestion/default-engine";
import type { AutoScheduleInput, AutoSchedulePlan } from "@/lib/workshop-schedule/intelligence/auto-scheduler/types";

const DEFAULT_MAX_SESSION_MIN = 120;

function splitDuration(totalMinutes: number, maxChunk: number): number[] {
  const chunks: number[] = [];
  let remaining = totalMinutes;
  while (remaining > 0) {
    const chunk = Math.min(remaining, maxChunk);
    chunks.push(chunk);
    remaining -= chunk;
  }
  return chunks.length ? chunks : [totalMinutes];
}

function confidenceFromScore(slotScore: number, daySaturation: number): number {
  let c = slotScore * 0.7;
  if (daySaturation < 70) c += 15;
  if (daySaturation > 90) c -= 20;
  return Math.max(0, Math.min(100, Math.round(c)));
}

/** Read-only plan — NEVER writes DB */
export function planAutoSchedule(
  input: AutoScheduleInput,
  engine = defaultScheduleSuggestionEngine,
): AutoSchedulePlan {
  const bounds = input.bounds ?? DEFAULT_DAY_BOUNDS;
  const maxChunk = input.maxSessionMinutes ?? DEFAULT_MAX_SESSION_MIN;
  const chunks = splitDuration(input.estimatedDurationMinutes, maxChunk);
  const suggestedSessions: AutoSchedulePlan["suggestedSessions"] = [];
  const virtualExisting = [...input.existingSessions];

  for (const durationMinutes of chunks) {
    let best: AutoSchedulePlan["suggestedSessions"][0] | null = null;

    for (const dayYmd of input.searchDaysYmd) {
      const dayCapacity =
        input.dayCapacityByYmd.get(dayYmd) ??
        computeDayCapacity(
          dayYmd,
          virtualExisting.filter((s) => s.planningStatus !== "cancelled"),
          bounds,
        );

      const slots = engine.suggest({
        durationMinutes,
        dayYmd,
        priority: input.priority,
        promisedDateYmd: input.promisedDateYmd,
        existingSessions: virtualExisting,
        dayCapacity,
        bounds,
      });

      const top = slots[0];
      if (!top) continue;
      if (!best || top.slotScore > best.slot_score) {
        best = {
          start_at: top.startAt,
          end_at: top.endAt,
          slot_score: top.slotScore,
          confidence: confidenceFromScore(top.slotScore, dayCapacity.saturationPct),
        };
      }
    }

    if (best) {
      suggestedSessions.push(best);
      virtualExisting.push({
        startAt: best.start_at,
        endAt: best.end_at,
        eventType: "intervento_programmato" as const,
        planningStatus: "scheduled" as const,
        workOrderId: input.workOrderId,
      });
    }
  }

  return { work_order_id: input.workOrderId, suggestedSessions };
}
