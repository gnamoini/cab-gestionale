import { buildBusinessValidationResult } from "@/lib/import-core/business-validator";
import type { BusinessValidationResult, ValidationIssue } from "@/lib/import-core/types";

export type OrdineFornitoreBusinessInput = {
  righe: Array<{ codice?: string; descrizione?: string; quantita?: number; prezzo?: number }>;
  totaleDocumento?: number | null;
  fornitoreTrovato?: boolean;
};

export function validateOrdineFornitoreBusiness(input: OrdineFornitoreBusinessInput): BusinessValidationResult {
  const issues: ValidationIssue[] = [];

  if (!input.fornitoreTrovato) {
    issues.push({
      field: "fornitore",
      code: "FORNITORE_NOT_FOUND",
      message: "Fornitore non trovato in anagrafica",
      severity: "warning",
    });
  }

  for (const [idx, row] of input.righe.entries()) {
    if ((row.prezzo ?? 0) < 0) {
      issues.push({
        field: `righe[${idx}].prezzo`,
        code: "PREZZO_NEGATIVO",
        message: "Prezzo riga negativo",
        severity: "blocking",
      });
    }
    if (!row.codice?.trim() && !row.descrizione?.trim()) {
      issues.push({
        field: `righe[${idx}]`,
        code: "RIGA_VUOTA",
        message: "Riga senza codice e descrizione",
        severity: "blocking",
      });
    }
  }

  if (input.totaleDocumento != null && input.totaleDocumento < 0) {
    issues.push({
      field: "totaleDocumento",
      code: "TOTALE_NEGATIVO",
      message: "Totale documento negativo",
      severity: "blocking",
    });
  }

  return buildBusinessValidationResult({ issues });
}
