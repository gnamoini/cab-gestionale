import { buildDayBoundsIso } from "@/lib/workshop-schedule/datetime";
import { detectConflicts } from "@/lib/workshop-schedule/overlap-policy";
import type { ScheduleSuggestionEngine, ScheduleSuggestionInput, SuggestedSlot } from "@/lib/workshop-schedule/slot-suggestion/types";

const SLOT_STEP_MIN = 30;

export const defaultScheduleSuggestionEngine: ScheduleSuggestionEngine = {
  suggest(input: ScheduleSuggestionInput): SuggestedSlot[] {
    const bounds = input.bounds ?? { startHour: 7, endHour: 19 };
    const { start: dayStartIso } = buildDayBoundsIso(input.dayYmd, bounds.startHour, bounds.endHour);
    const dayStartMs = Date.parse(dayStartIso);
    const slots: SuggestedSlot[] = [];

    for (let offset = 0; offset <= (bounds.endHour - bounds.startHour) * 60 - input.durationMinutes; offset += SLOT_STEP_MIN) {
      const startAt = new Date(dayStartMs + offset * 60_000).toISOString();
      const endAt = new Date(dayStartMs + (offset + input.durationMinutes) * 60_000).toISOString();
      const conflicts = detectConflicts(
        { startAt, endAt, workOrderId: null, eventType: "intervento_programmato" },
        input.existingSessions.map((s, i) => ({
          id: `existing-${i}`,
          title: "",
          ...s,
        })),
      );
      const hard = conflicts.some((c) => c.conflictType === "cross_wo" || c.conflictType === "block");
      if (hard) continue;

      let score = 70;
      const reasons: string[] = [];
      if (input.dayCapacity.saturationPct < 60) {
        score += 10;
        reasons.push("Capacità giornaliera favorevole");
      } else if (input.dayCapacity.saturationPct > 85) {
        score -= 20;
        reasons.push("Giornata quasi satura");
      }
      if (input.priority === "alta" && offset <= 120) {
        score += 10;
        reasons.push("Slot mattutino per priorità alta");
      }
      if (input.promisedDateYmd && input.dayYmd <= input.promisedDateYmd) {
        score += 5;
        reasons.push("Entro data promessa");
      }
      if (offset >= 480) score -= 5;
      score = Math.max(0, Math.min(100, score));
      slots.push({ startAt, endAt, slotScore: score, reasons });
    }

    return slots.sort((a, b) => b.slotScore - a.slotScore).slice(0, 8);
  },
};
