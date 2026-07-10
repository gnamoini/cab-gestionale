import { buildBusinessValidationResult } from "@/lib/import-core/business-validator";
import type { BusinessValidationResult, ValidationIssue } from "@/lib/import-core/types";

export type ListinoRowBusinessInput = {
  codice: string;
  descrizione: string;
  costo: number;
  categoria?: string | null;
  codiceEsistente?: boolean;
};

export function validateListinoRowBusiness(row: ListinoRowBusinessInput): BusinessValidationResult {
  const issues: ValidationIssue[] = [];

  if (!row.categoria?.trim()) {
    issues.push({
      field: "categoria",
      code: "CATEGORIA_MANCANTE",
      message: "Categoria non assegnata",
      severity: "warning",
    });
  }

  if (row.costo < 0) {
    issues.push({
      field: "costo",
      code: "PREZZO_NEGATIVO",
      message: "Costo negativo",
      severity: "blocking",
    });
  }

  if (row.codiceEsistente) {
    issues.push({
      field: "codice",
      code: "CODICE_DUPLICATO",
      message: "Codice già presente a magazzino",
      severity: "warning",
    });
  }

  return buildBusinessValidationResult({ issues });
}
