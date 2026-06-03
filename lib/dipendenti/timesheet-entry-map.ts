import { resolveTipoById } from "@/lib/dipendenti/tipi-assenza-model";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type { TimesheetCellValue, TimesheetEntryUpsert } from "@/lib/dipendenti/types";

export function cellValueToUpsert(
  dipendenteId: string,
  workDate: string,
  value: TimesheetCellValue,
  tipi: readonly TipoAssenzaConfig[],
): TimesheetEntryUpsert {
  const tipo = resolveTipoById(tipi, value.tipoAssenzaId);
  return {
    dipendenteId,
    workDate,
    oreOrdinarie: value.oreOrdinarie,
    oreStraordinarie: value.oreStraordinarie,
    oreAssenza: value.oreAssenza,
    tipoAssenzaId: value.tipoAssenzaId,
    tipoAssenzaLabel: tipo?.label ?? value.tipoAssenzaLabel,
    motivoCustom: value.motivoCustom,
    note: value.note,
  };
}
