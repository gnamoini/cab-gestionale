import type { PreventivoRecord } from "@/lib/preventivi/types";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import type { AnalyticsHoursResult } from "@/lib/analytics/hours/types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getEstimatedLaborHoursFromPreventivo(record: PreventivoRecord): AnalyticsHoursResult {
  const hours = round2(Number(record.manodopera?.oreTotali ?? 0));
  return {
    hours,
    kind: "estimated",
    source: "preventivi.dettagli.manodopera.oreTotali",
    confidence: "high",
    consistency: hours > 0 ? "ok" : "missing",
  };
}

export function sumEstimatedLaborHours(
  records: readonly PreventivoRecord[],
  range: DateRange,
  options?: { excludeBozza?: boolean },
): AnalyticsHoursResult {
  const excludeBozza = options?.excludeBozza ?? true;
  let total = 0;
  for (const rec of records) {
    if (excludeBozza && rec.stato === "bozza") continue;
    if (!rec.dataCreazione || !isoInRange(rec.dataCreazione, range)) continue;
    total += Number(rec.manodopera?.oreTotali ?? 0);
  }
  return {
    hours: round2(total),
    kind: "estimated",
    source: "preventivi.dettagli.manodopera.oreTotali",
    confidence: "high",
    consistency: total > 0 ? "ok" : "missing",
  };
}
