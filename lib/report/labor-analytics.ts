import { entryToCellValue } from "@/lib/dipendenti/timesheet-totals";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
} from "@/lib/dipendenti/types";
import { oreTotaliFromBundleLavorazioni } from "@/lib/lavorazioni/ore-totali-scheda";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import { oreSeriesProvider } from "@/lib/report/kpi-series/providers/ore";
import type { LavorazioneSchedeStore } from "@/types/schede";

export const ORE_OVERTIME_WARN_PCT = 15;
export const ORE_HOURS_DROP_WARN_PCT = 20;
export const ORE_GAP_SCHEDE_WARN_PCT = 10;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundPct(n: number): number {
  return Math.round(n * 10) / 10;
}

export type LaborComposition = {
  oreOrdinarie: number;
  oreStraordinarie: number;
  oreAssenza: number;
  totaleLavorato: number;
  overtimePct: number | null;
};

export function computeLaborComposition(entries: readonly DipendenteTimesheetEntryRow[]): LaborComposition {
  let oreOrdinarie = 0;
  let oreStraordinarie = 0;
  let oreAssenza = 0;
  for (const entry of entries) {
    const cell = entryToCellValue(entry);
    oreOrdinarie += cell.oreOrdinarie;
    oreStraordinarie += cell.oreStraordinarie;
    oreAssenza += cell.oreAssenza;
  }
  const totaleLavorato = round1(oreOrdinarie + oreStraordinarie);
  const overtimePct =
    totaleLavorato > 0 ? roundPct((oreStraordinarie / totaleLavorato) * 100) : null;
  return {
    oreOrdinarie: round1(oreOrdinarie),
    oreStraordinarie: round1(oreStraordinarie),
    oreAssenza: round1(oreAssenza),
    totaleLavorato,
    overtimePct,
  };
}

export function countWeekdaysInRange(range: DateRange): number {
  let count = 0;
  const cur = new Date(range.start);
  const end = new Date(range.end);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** ponytail: capacità = dipendenti con ore × 8h × giorni feriali nel range; upgrade: calendario festivi + FTE */
export function computeTeamSaturation(
  totalHours: number,
  employeesWithHours: number,
  range: DateRange,
  hoursPerDay = 8,
): number | null {
  if (employeesWithHours <= 0 || totalHours <= 0) return null;
  const weekdays = countWeekdaysInRange(range);
  const capacity = employeesWithHours * hoursPerDay * weekdays;
  if (capacity <= 0) return null;
  return roundPct((totalHours / capacity) * 100);
}

export function sumOreFromSchedeInRange(
  completate: readonly LavorazioneArchiviata[],
  range: DateRange,
  schedeStore: LavorazioneSchedeStore | null,
): number {
  if (!schedeStore) return 0;
  let total = 0;
  for (const c of completate) {
    if (!c.dataCompletamento || !isoInRange(c.dataCompletamento, range)) continue;
    const bundle = schedeStore[c.id];
    if (!bundle) continue;
    const ore = oreTotaliFromBundleLavorazioni(bundle);
    if (ore != null && ore > 0) total += ore;
  }
  return round1(total);
}

export function computeGapSchedeTimesheetPct(timesheetHours: number, schedeHours: number): number | null {
  if (timesheetHours <= 0 || schedeHours <= 0) return null;
  return roundPct((Math.abs(schedeHours - timesheetHours) / timesheetHours) * 100);
}

export type AssenzaPerTipoRow = {
  label: string;
  oreAssenza: number;
  giorni: number;
};

export function aggregateAssenzePerTipo(entries: readonly DipendenteTimesheetEntryRow[]): AssenzaPerTipoRow[] {
  const map = new Map<string, { oreAssenza: number; giorni: number }>();
  for (const entry of entries) {
    const cell = entryToCellValue(entry);
    if (cell.oreAssenza <= 0) continue;
    const label = cell.tipoAssenzaLabel || cell.motivoCustom || "Assenza";
    const prev = map.get(label) ?? { oreAssenza: 0, giorni: 0 };
    map.set(label, {
      oreAssenza: round1(prev.oreAssenza + cell.oreAssenza),
      giorni: prev.giorni + 1,
    });
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.oreAssenza - a.oreAssenza || a.label.localeCompare(b.label, "it"));
}

export function countEmployeesWithoutHours(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  entries: readonly DipendenteTimesheetEntryRow[],
): number {
  const withHours = new Set<string>();
  for (const entry of entries) {
    const cell = entryToCellValue(entry);
    if (cell.oreOrdinarie + cell.oreStraordinarie > 0) withHours.add(entry.dipendente_id);
  }
  let missing = 0;
  for (const emp of employees) {
    if (!emp.in_settings) continue;
    if (!withHours.has(emp.id)) missing += 1;
  }
  return missing;
}

export type OreMonthlyPoint = { label: string; value: number };

export function buildOreMonthlyTrendPoints(
  range: DateRange,
  entries: readonly DipendenteTimesheetEntryRow[],
): OreMonthlyPoint[] {
  const series = oreSeriesProvider("ore_total", {
    range,
    bucket: "month",
    timesheetEntries: entries,
    attive: [],
    storico: [],
    completate: [],
    magLog: [],
    prodotti: [],
  });
  if (series.status !== "ready" && series.status !== "empty") return [];
  return series.points
    .filter((p) => p.value != null && p.value > 0)
    .map((p) => ({
      label: p.date.slice(5),
      value: p.value ?? 0,
    }));
}

export type PresenceHeatmapCell = {
  dipendente: string;
  weekLabel: string;
  hours: number;
};

/** ponytail: settimana ISO lunedì; upgrade: calendario turni */
export function buildPresenceHeatmap(
  entries: readonly DipendenteTimesheetEntryRow[],
  employees: readonly DipendenteTimesheetEmployeeRow[],
  maxEmployees = 8,
): PresenceHeatmapCell[] {
  const labelById = new Map(employees.map((e) => [e.id, e.display_name.trim() || e.id]));
  const byEmpWeek = new Map<string, number>();

  for (const entry of entries) {
    const cell = entryToCellValue(entry);
    const hours = cell.oreOrdinarie + cell.oreStraordinarie;
    if (hours <= 0) continue;
    const d = new Date(`${entry.work_date}T12:00:00`);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    const weekKey = d.toISOString().slice(0, 10);
    const empKey = `${entry.dipendente_id}::${weekKey}`;
    byEmpWeek.set(empKey, round1((byEmpWeek.get(empKey) ?? 0) + hours));
  }

  const empTotals = new Map<string, number>();
  for (const [key, hours] of byEmpWeek) {
    const empId = key.split("::")[0]!;
    empTotals.set(empId, (empTotals.get(empId) ?? 0) + hours);
  }
  const topEmpIds = [...empTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxEmployees)
    .map(([id]) => id);

  const out: PresenceHeatmapCell[] = [];
  for (const [key, hours] of byEmpWeek) {
    const [empId, weekKey] = key.split("::") as [string, string];
    if (!topEmpIds.includes(empId)) continue;
    out.push({
      dipendente: labelById.get(empId) ?? empId,
      weekLabel: weekKey.slice(5),
      hours,
    });
  }
  return out.sort(
    (a, b) => a.weekLabel.localeCompare(b.weekLabel) || a.dipendente.localeCompare(b.dipendente, "it"),
  );
}

export type ProductivityScoreRow = {
  dipendente: string;
  ore: number;
  score: number;
};

/** Score 0–100 vs media team (100 = media, >100 sopra media). */
export function computeProductivityScores(
  ranking: readonly { dipendente: string; ore: number }[],
): ProductivityScoreRow[] {
  if (ranking.length === 0) return [];
  const avg = ranking.reduce((s, r) => s + r.ore, 0) / ranking.length;
  if (avg <= 0) return ranking.map((r) => ({ dipendente: r.dipendente, ore: r.ore, score: 0 }));
  return ranking.map((r) => ({
    dipendente: r.dipendente,
    ore: r.ore,
    score: roundPct((r.ore / avg) * 100),
  }));
}

export function forecastOreNextMonth(points: readonly OreMonthlyPoint[]): number | null {
  if (points.length < 2) return null;
  const last = points.slice(-3);
  const avg = last.reduce((s, p) => s + p.value, 0) / last.length;
  return round1(avg);
}

export type ScatterOreRicambiPoint = {
  label: string;
  ore: number;
  ricambi: number;
};

export function buildOreRicambiScatterPoints(
  completate: readonly LavorazioneArchiviata[],
  range: DateRange,
  schedeStore: LavorazioneSchedeStore | null,
  magazzinoById: ReadonlyMap<string, { costo?: number | null }>,
): ScatterOreRicambiPoint[] {
  if (!schedeStore) return [];
  const out: ScatterOreRicambiPoint[] = [];
  for (const c of completate) {
    if (!c.dataCompletamento || !isoInRange(c.dataCompletamento, range)) continue;
    const bundle = schedeStore[c.id];
    if (!bundle) continue;
    const ore = oreTotaliFromBundleLavorazioni(bundle);
    if (ore == null || ore <= 0) continue;
    const righe = bundle.ricambi?.campi.righe ?? [];
    let ricambi = 0;
    for (const r of righe) {
      const qty = Number.isFinite(r.quantita) && r.quantita > 0 ? r.quantita : 0;
      if (qty <= 0) continue;
      const id = r.ricambioId?.trim();
      if (!id) continue;
      const cost = magazzinoById.get(id)?.costo ?? 0;
      ricambi += qty * (typeof cost === "number" && cost >= 0 ? cost : 0);
    }
    out.push({
      label: c.codice ?? c.id.slice(0, 8),
      ore: round1(ore),
      ricambi: round1(ricambi),
    });
  }
  return out.slice(0, 40);
}
