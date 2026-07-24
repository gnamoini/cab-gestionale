import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { LavorazioneRow } from "@/src/types/supabase-tables";
import type { EstimateVsActualResult } from "@/lib/analytics/hours/types";
import { getActualLaborHoursFromRow } from "@/lib/analytics/hours/get-actual-labor-hours";
import { getEstimatedLaborHoursFromPreventivo } from "@/lib/analytics/hours/get-estimated-labor-hours";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Confronto stima (preventivo) vs consuntivo (lavorazione.actual_labor_hours).
 * Domini separati: modifica preventivo non altera actualHours.
 */
export function getEstimateVsActualDelta(
  preventivi: readonly PreventivoRecord[],
  lavorazioni: readonly Pick<LavorazioneRow, "id" | "actual_labor_hours" | "actual_labor_hours_source">[],
): EstimateVsActualResult {
  const lavById = new Map(lavorazioni.map((l) => [l.id, l]));
  const rows = [];

  for (const prev of preventivi) {
    const lavId = prev.lavorazioneId?.trim();
    if (!lavId) continue;
    const lav = lavById.get(lavId);
    if (!lav) continue;

    const estimated = getEstimatedLaborHoursFromPreventivo(prev).hours;
    const actual = getActualLaborHoursFromRow(lav).hours;
    const deltaHours = round2(actual - estimated);
    const deltaPct =
      estimated > 0 ? round2(((actual - estimated) / estimated) * 100) : null;

    rows.push({
      lavorazioneId: lavId,
      preventivoId: prev.id,
      estimatedHours: estimated,
      actualHours: actual,
      deltaHours,
      deltaPct,
    });
  }

  rows.sort((a, b) => Math.abs(b.deltaHours) - Math.abs(a.deltaHours));

  const totalEstimated = round2(rows.reduce((s, r) => s + r.estimatedHours, 0));
  const totalActual = round2(rows.reduce((s, r) => s + r.actualHours, 0));

  return { rows, totalEstimated, totalActual };
}
