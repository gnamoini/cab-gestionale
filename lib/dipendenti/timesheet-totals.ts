import type { DipendenteTimesheetEntryRow, TimesheetCellValue, TimesheetMonthTotals } from "@/lib/dipendenti/types";

export function normalizeCellValue(input: Partial<TimesheetCellValue>): TimesheetCellValue {
  const oreOrdinarie = clampOre(input.oreOrdinarie ?? 0);
  const oreStraordinarie = clampOre(input.oreStraordinarie ?? 0);
  const oreAssenza = clampOre(input.oreAssenza ?? 0);

  return {
    oreOrdinarie,
    oreStraordinarie,
    oreAssenza,
    tipoAssenzaId: input.tipoAssenzaId?.trim() || null,
    tipoAssenzaLabel: (input.tipoAssenzaLabel ?? "").trim(),
    motivoCustom: (input.motivoCustom ?? "").trim(),
    note: (input.note ?? "").trim(),
  };
}

export function clampOre(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.round(v * 100) / 100;
}

export function entryToCellValue(entry: DipendenteTimesheetEntryRow | undefined): TimesheetCellValue {
  if (!entry) {
    return emptyCellValue();
  }

  const oreAssenza =
    Number(entry.ore_assenza) > 0
      ? Number(entry.ore_assenza)
      : entry.assenza
        ? 8
        : 0;

  return normalizeCellValue({
    oreOrdinarie: Number(entry.ore_ordinarie),
    oreStraordinarie: Number(entry.ore_straordinarie),
    oreAssenza,
    tipoAssenzaId: entry.tipo_assenza_id,
    tipoAssenzaLabel: entry.tipo_assenza_label ?? entry.motivo_assenza ?? "",
    motivoCustom: entry.motivo_assenza && entry.tipo_assenza_label === "Altro" ? entry.motivo_assenza : "",
    note: entry.note ?? "",
  });
}

export function emptyCellValue(): TimesheetCellValue {
  return {
    oreOrdinarie: 0,
    oreStraordinarie: 0,
    oreAssenza: 0,
    tipoAssenzaId: null,
    tipoAssenzaLabel: "",
    motivoCustom: "",
    note: "",
  };
}

export function isCellEmpty(value: TimesheetCellValue): boolean {
  return value.oreOrdinarie <= 0 && value.oreStraordinarie <= 0 && value.oreAssenza <= 0 && !value.note.trim();
}

export function computeMonthTotals(entries: readonly DipendenteTimesheetEntryRow[]): TimesheetMonthTotals {
  let oreOrdinarie = 0;
  let oreStraordinarie = 0;
  let oreAssenza = 0;
  let giorniAssenza = 0;

  for (const e of entries) {
    const cell = entryToCellValue(e);
    oreOrdinarie += cell.oreOrdinarie;
    oreStraordinarie += cell.oreStraordinarie;
    oreAssenza += cell.oreAssenza;
    if (cell.oreAssenza > 0) giorniAssenza += 1;
  }

  return {
    oreOrdinarie: clampOre(oreOrdinarie),
    oreStraordinarie: clampOre(oreStraordinarie),
    oreAssenza: clampOre(oreAssenza),
    totaleLavorato: clampOre(oreOrdinarie + oreStraordinarie),
    giorniAssenza,
  };
}
