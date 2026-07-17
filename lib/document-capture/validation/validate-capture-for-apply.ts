import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import {
  inferCaptureSchedaTipo,
  mapCaptureFieldsToIngresso,
  resolveRawFieldValue,
} from "@/lib/document-capture/capture-field-mapper";
import {
  ricambiNotFoundBlocksForceReview,
  ricambiResolutionBlocksApply,
  resolveRicambiRowsFromCaptureFields,
} from "@/lib/document-capture/ricambi-resolution";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { parseItalianDayDisplayToIso } from "@/lib/ui/italian-date-input-mask";

export type ValidationIssue = {
  code: string;
  fieldKey?: string;
  message: string;
  severity: "error" | "warning";
};

export type ValidateCaptureResult = {
  status: "READY" | "BLOCKED" | "REVIEW";
  issues: ValidationIssue[];
  ricambiRows?: ReturnType<typeof resolveRicambiRowsFromCaptureFields>;
};

export type ValidateCaptureInput = {
  fields: readonly CaptureFieldRow[];
  magazzino?: readonly RicambioMagazzino[];
  lavorazioneId?: string | null;
  minConfidence?: number;
};

function parseNum(value: string): number | null {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function fieldValue(fields: readonly CaptureFieldRow[], ...keys: string[]): string {
  return resolveRawFieldValue(fields, ...keys);
}

/** SSOT pre-apply validation — used by dry-run and apply gate. */
export function validateCaptureForApply(input: ValidateCaptureInput): ValidateCaptureResult {
  const issues: ValidationIssue[] = [];
  const schedaTipo = inferCaptureSchedaTipo(input.fields);
  const ingresso = mapCaptureFieldsToIngresso(input.fields);
  const minConf = input.minConfidence ?? 0.75;

  if (schedaTipo === "ingresso" || !schedaTipo) {
    if (!ingresso.cliente.trim()) {
      issues.push({
        code: "MISSING_CLIENTE",
        fieldKey: "cliente",
        message: "Cliente obbligatorio per la scheda ingresso.",
        severity: "error",
      });
    }
    const hasMezzo =
      ingresso.targa.trim() ||
      ingresso.matricola.trim() ||
      ingresso.nScuderia.trim() ||
      ingresso.vin.trim();
    if (!hasMezzo) {
      issues.push({
        code: "MISSING_MEZZO_IDENT",
        message: "Indicare almeno targa, matricola, n. scuderia o VIN.",
        severity: "error",
      });
    }
    if (ingresso.dataIngresso.trim()) {
      const parsed = parseItalianDayDisplayToIso(ingresso.dataIngresso);
      if (!parsed.ok) {
        issues.push({
          code: "INVALID_DATA_INGRESSO",
          fieldKey: "data_ingresso",
          message: "Data ingresso non valida.",
          severity: "error",
        });
      }
    }
  }

  const km = parseNum(ingresso.km || fieldValue(input.fields, "km"));
  if (km !== null && km < 0) {
    issues.push({ code: "NEGATIVE_KM", fieldKey: "km", message: "Km non può essere negativo.", severity: "error" });
  }

  for (let n = 1; n <= 24; n += 1) {
    const ore = fieldValue(input.fields, `riga_${n}_ore`);
    if (!ore) continue;
    const o = parseNum(ore);
    if (o !== null && o < 0) {
      issues.push({
        code: "NEGATIVE_ORE",
        fieldKey: `riga_${n}_ore`,
        message: `Ore riga ${n} non possono essere negative.`,
        severity: "error",
      });
    }
  }

  let ricambiRows: ReturnType<typeof resolveRicambiRowsFromCaptureFields> | undefined;
  const hasRicambi = input.fields.some((f) => /^riga_\d+_(codice|nome|descrizione|qt)/i.test(f.field_key));
  if (hasRicambi && input.magazzino?.length) {
    ricambiRows = resolveRicambiRowsFromCaptureFields(input.fields, input.magazzino);
    for (const row of ricambiRows) {
      if (row.status === "AMBIGUOUS") {
        issues.push({
          code: "RICAMBIO_AMBIGUOUS",
          fieldKey: row.fieldKey,
          message: `Ricambio riga ${row.rowIndex}: più corrispondenze in magazzino.`,
          severity: "warning",
        });
      }
      if (row.status === "NOT_FOUND") {
        issues.push({
          code: "RICAMBIO_NOT_FOUND",
          fieldKey: row.fieldKey,
          message: `Ricambio riga ${row.rowIndex} non trovato in magazzino.`,
          severity: "warning",
        });
      }
    }
    const qtIssues = input.fields
      .filter((f) => /^riga_\d+_qt$/i.test(f.field_key))
      .map((f) => {
        const v = f.confirmed_value ?? f.normalized_value ?? "";
        const q = parseNum(String(v));
        if (q !== null && q <= 0) {
          return {
            code: "INVALID_QUANTITA",
            fieldKey: f.field_key,
            message: `Quantità non valida per ${f.field_key}.`,
            severity: "error" as const,
          };
        }
        return null;
      })
      .filter(Boolean) as ValidationIssue[];
    issues.push(...qtIssues);
  }

  for (const row of input.fields) {
    const conf =
      "confidence" in row && typeof (row as { confidence?: unknown }).confidence === "number"
        ? (row as { confidence: number }).confidence
        : null;
    if (conf !== null && conf < minConf && (row.confirmed_value ?? row.normalized_value)) {
      issues.push({
        code: "LOW_CONFIDENCE",
        fieldKey: row.field_key,
        message: `Campo ${row.field_key}: confidence bassa (${Math.round(conf * 100)}%).`,
        severity: "warning",
      });
    }
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  const hasWarnings = issues.some((i) => i.severity === "warning");
  const ricambiBlock = ricambiRows ? ricambiResolutionBlocksApply(ricambiRows) : false;

  if (hasErrors) return { status: "BLOCKED", issues, ricambiRows };
  if (hasWarnings || ricambiBlock) return { status: "REVIEW", issues, ricambiRows };
  return { status: "READY", issues, ricambiRows };
}

/** Consente "Procedi comunque" solo per warning/ambiguità — mai con ricambi NOT_FOUND. */
export function captureReviewAllowsForceApply(validation: ValidateCaptureResult): boolean {
  if (validation.ricambiRows && ricambiNotFoundBlocksForceReview(validation.ricambiRows)) return false;
  return true;
}
