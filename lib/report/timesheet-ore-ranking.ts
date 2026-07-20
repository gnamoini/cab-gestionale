import { entryToCellValue } from "@/lib/dipendenti/timesheet-totals";
import type { DipendenteTimesheetEmployeeRow, DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";

export type OrePerDipendenteRow = {
  dipendenteId: string;
  dipendente: string;
  ore: number;
};

export type OrePerDipendenteDetailedRow = {
  dipendenteId: string;
  dipendente: string;
  oreOrdinarie: number;
  oreStraordinarie: number;
  oreAssenza: number;
  totaleLavorato: number;
  pctTeam: number;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Ore lavorate (ordinarie + straordinarie) per dipendente nel set di entry filtrate. */
export function aggregateOrePerDipendente(
  entries: readonly DipendenteTimesheetEntryRow[],
  employees: readonly DipendenteTimesheetEmployeeRow[],
): OrePerDipendenteRow[] {
  const byId = new Map<string, number>();
  const labelById = new Map(employees.map((e) => [e.id, e.display_name.trim() || e.id]));

  for (const entry of entries) {
    const cell = entryToCellValue(entry);
    const ore = cell.oreOrdinarie + cell.oreStraordinarie;
    if (ore <= 0) continue;
    byId.set(entry.dipendente_id, round1((byId.get(entry.dipendente_id) ?? 0) + ore));
  }

  return [...byId.entries()]
    .map(([dipendenteId, ore]) => ({
      dipendenteId,
      dipendente: labelById.get(dipendenteId) ?? entries.find((e) => e.dipendente_id === dipendenteId)?.employee_display_name_snapshot ?? dipendenteId,
      ore,
    }))
    .sort((a, b) => b.ore - a.ore);
}

/** Breakdown ordinarie/straordinarie/assenze per dipendente con quota sul totale team. */
export function aggregateOrePerDipendenteDetailed(
  entries: readonly DipendenteTimesheetEntryRow[],
  employees: readonly DipendenteTimesheetEmployeeRow[],
): OrePerDipendenteDetailedRow[] {
  const labelById = new Map(employees.map((e) => [e.id, e.display_name.trim() || e.id]));
  const byId = new Map<string, { ord: number; str: number; ass: number }>();

  for (const entry of entries) {
    const cell = entryToCellValue(entry);
    const prev = byId.get(entry.dipendente_id) ?? { ord: 0, str: 0, ass: 0 };
    byId.set(entry.dipendente_id, {
      ord: round1(prev.ord + cell.oreOrdinarie),
      str: round1(prev.str + cell.oreStraordinarie),
      ass: round1(prev.ass + cell.oreAssenza),
    });
  }

  let teamTotal = 0;
  const rows = [...byId.entries()].map(([dipendenteId, v]) => {
    const totaleLavorato = round1(v.ord + v.str);
    teamTotal += totaleLavorato;
    return {
      dipendenteId,
      dipendente:
        labelById.get(dipendenteId) ??
        entries.find((e) => e.dipendente_id === dipendenteId)?.employee_display_name_snapshot ??
        dipendenteId,
      oreOrdinarie: v.ord,
      oreStraordinarie: v.str,
      oreAssenza: v.ass,
      totaleLavorato,
      pctTeam: 0,
    };
  });

  return rows
    .filter((r) => r.totaleLavorato > 0 || r.oreAssenza > 0)
    .map((r) => ({
      ...r,
      pctTeam: teamTotal > 0 ? Math.round((r.totaleLavorato / teamTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.totaleLavorato - a.totaleLavorato);
}
