import type { LavorazioneRow } from "@/src/types/supabase-tables";
import type { AnalyticsHoursResult } from "@/lib/analytics/hours/types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type LavorazioneWithActualHours = Pick<
  LavorazioneRow,
  "id" | "actual_labor_hours" | "actual_labor_hours_source"
>;

/**
 * Legge ore consuntive dalla colonna denormalizzata.
 * Mai fallback silenzioso su JSONB — usare `hoursIntegrityCheck` per mismatch.
 */
export function getActualLaborHoursFromRow(row: LavorazioneWithActualHours): AnalyticsHoursResult {
  const hours = round2(Number(row.actual_labor_hours ?? 0));
  const sourceFlag = row.actual_labor_hours_source;
  const anomalies: string[] = [];
  let confidence: AnalyticsHoursResult["confidence"] = "high";
  let consistency: AnalyticsHoursResult["consistency"] = hours > 0 ? "ok" : "missing";

  if (sourceFlag === "safety_net_trigger") {
    confidence = "warning";
    anomalies.push("source=safety_net_trigger");
  }

  return {
    hours,
    kind: "actual",
    source: "lavorazioni.actual_labor_hours",
    confidence,
    consistency,
    anomalies: anomalies.length ? anomalies : undefined,
  };
}

export function sumActualLaborHours(
  rows: readonly LavorazioneWithActualHours[],
): AnalyticsHoursResult {
  let total = 0;
  let warning = false;
  let missing = 0;
  for (const row of rows) {
    const r = getActualLaborHoursFromRow(row);
    total += r.hours;
    if (r.confidence === "warning") warning = true;
    if (r.consistency === "missing") missing += 1;
  }
  return {
    hours: round2(total),
    kind: "actual",
    source: "lavorazioni.actual_labor_hours",
    confidence: warning ? "warning" : "high",
    consistency: missing === rows.length && rows.length > 0 ? "missing" : "ok",
    anomalies: warning ? ["safety_net_trigger_present"] : undefined,
  };
}
