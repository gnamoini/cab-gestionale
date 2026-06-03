import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import { resolveTipoById } from "@/lib/dipendenti/tipi-assenza-model";
import type { TimesheetCellValue } from "@/lib/dipendenti/types";

export const MAX_DAILY_HOURS = 24;

export type TimesheetValidationResult = {
  ok: boolean;
  errors: string[];
};

export function validateCellValue(
  value: TimesheetCellValue,
  tipiAssenza: readonly TipoAssenzaConfig[],
): TimesheetValidationResult {
  const errors: string[] = [];
  const { oreOrdinarie, oreStraordinarie, oreAssenza } = value;

  if (!Number.isFinite(oreOrdinarie) || oreOrdinarie < 0) {
    errors.push("Le ore ordinarie devono essere ≥ 0.");
  }
  if (!Number.isFinite(oreStraordinarie) || oreStraordinarie < 0) {
    errors.push("Le ore straordinarie devono essere ≥ 0.");
  }
  if (!Number.isFinite(oreAssenza) || oreAssenza < 0) {
    errors.push("Le ore assenza devono essere ≥ 0.");
  }

  const total = (oreOrdinarie || 0) + (oreStraordinarie || 0) + (oreAssenza || 0);
  if (total > MAX_DAILY_HOURS) {
    errors.push(`Il totale giornaliero non può superare ${MAX_DAILY_HOURS} ore.`);
  }

  if (oreAssenza > 0) {
    if (!value.tipoAssenzaId?.trim()) {
      errors.push("Seleziona un tipo assenza.");
    } else {
      const tipo = resolveTipoById(tipiAssenza, value.tipoAssenzaId);
      if (!tipo) {
        errors.push("Tipo assenza non valido.");
      } else       if (tipo.requiresCustomText && !value.motivoCustom.trim()) {
        errors.push("Specifica il motivo per «Altro».");
      } else if (tipo.requiresCustomText && value.motivoCustom.trim().length > 500) {
        errors.push("Il motivo personalizzato è troppo lungo (max 500 caratteri).");
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
