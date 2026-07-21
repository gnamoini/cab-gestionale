import type {
  MezzoMaintenanceKpi,
  OfficinaMaintenanceKpi,
  PresetMaintenanceKpi,
  TagliandiOverviewRow,
} from "@/lib/maintenance-plans/v2-types";

export function selectMezzoMaintenanceKpi(input: {
  executions: { performedAt: string; totalCost: number | null; oreAtService: number }[];
  oreAnnue: number;
}): MezzoMaintenanceKpi {
  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const yearAgoStr = yearAgo.toISOString().slice(0, 10);

  const recent = input.executions.filter((e) => e.performedAt >= yearAgoStr);
  const costoAnnuale = recent.reduce((s, e) => s + (e.totalCost ?? 0), 0);

  const oreDeltas: number[] = [];
  const sorted = [...input.executions].sort((a, b) => a.performedAt.localeCompare(b.performedAt));
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i]!.oreAtService - sorted[i - 1]!.oreAtService;
    if (d > 0) oreDeltas.push(d);
  }
  const oreTraTagliandi =
    oreDeltas.length > 0 ? oreDeltas.reduce((s, v) => s + v, 0) / oreDeltas.length : null;

  const costoPerOra =
    input.oreAnnue > 0 && costoAnnuale > 0 ? costoAnnuale / input.oreAnnue : null;

  return {
    costoAnnuale,
    oreTraTagliandi,
    puntualitaPct: null,
    mediaRitardoGiorni: null,
    costoPerOra,
  };
}

export function selectPresetMaintenanceKpi(input: {
  executions: { totalCost: number | null; performedAt: string }[];
  partsReplaced: { ricambioId: string; descrizione: string }[];
}): PresetMaintenanceKpi {
  const costs = input.executions.map((e) => e.totalCost ?? 0).filter((c) => c > 0);
  const costoMedio = costs.length > 0 ? costs.reduce((s, v) => s + v, 0) / costs.length : 0;

  const dayGaps: number[] = [];
  const sorted = [...input.executions].sort((a, b) => a.performedAt.localeCompare(b.performedAt));
  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(`${sorted[i - 1]!.performedAt}T12:00:00`).getTime();
    const b = new Date(`${sorted[i]!.performedAt}T12:00:00`).getTime();
    const days = (b - a) / (1000 * 60 * 60 * 24);
    if (days > 0) dayGaps.push(days);
  }
  const durataMediaGiorni =
    dayGaps.length > 0 ? dayGaps.reduce((s, v) => s + v, 0) / dayGaps.length : null;
  const mean = durataMediaGiorni ?? 0;
  const deviazioneStdGiorni =
    dayGaps.length > 1
      ? Math.sqrt(dayGaps.reduce((s, v) => s + (v - mean) ** 2, 0) / (dayGaps.length - 1))
      : null;

  const counts = new Map<string, { descrizione: string; count: number }>();
  for (const p of input.partsReplaced) {
    const cur = counts.get(p.ricambioId) ?? { descrizione: p.descrizione, count: 0 };
    cur.count++;
    counts.set(p.ricambioId, cur);
  }
  const ricambiTop = [...counts.entries()]
    .map(([ricambioId, v]) => ({ ricambioId, descrizione: v.descrizione, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { costoMedio, durataMediaGiorni, deviazioneStdGiorni, ricambiTop };
}

export function selectOfficinaMaintenanceKpi(rows: TagliandiOverviewRow[]): OfficinaMaintenanceKpi {
  const today = new Date().toISOString().slice(0, 10);
  const in30 = addDays(today, 30);
  return {
    tagliandiEseguiti: 0,
    previsti30Giorni: rows.filter(
      (r) => r.nextDateEstimated && r.nextDateEstimated >= today && r.nextDateEstimated <= in30,
    ).length,
    scaduti: rows.filter((r) => r.urgency === "rosso").length,
    ricambiDaPreparare: rows
      .filter((r) => r.urgency === "arancione" || r.urgency === "rosso")
      .reduce((s, r) => s + r.partsCount, 0),
  };
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function selectDashboardMaintenanceCards(rows: TagliandiOverviewRow[]) {
  const today = new Date().toISOString().slice(0, 10);
  const in7 = addDays(today, 7);
  const in30 = addDays(today, 30);
  return {
    prossimi7g: rows.filter(
      (r) => r.nextDateEstimated && r.nextDateEstimated >= today && r.nextDateEstimated <= in7,
    ).length,
    prossimi30g: rows.filter(
      (r) => r.nextDateEstimated && r.nextDateEstimated >= today && r.nextDateEstimated <= in30,
    ).length,
    scaduti: rows.filter((r) => r.urgency === "rosso").length,
    mezziCritici: rows.filter((r) => r.urgency === "rosso" || r.urgency === "arancione").length,
    avgConfidence:
      rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + (r.confidencePct ?? 0), 0) / rows.length)
        : 0,
  };
}
