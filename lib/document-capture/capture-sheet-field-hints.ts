import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import { resolveRawFieldValue } from "@/lib/document-capture/capture-field-mapper";
import {
  captureFieldRowsToOcrBaseline,
  type CaptureFieldPatch,
} from "@/lib/document-capture/capture-scheda-compile-payload";
import { resolveRicambiRowsFromCaptureFields } from "@/lib/document-capture/ricambi-resolution";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { findAddettoByStoredName } from "@/lib/lavorazioni/addetto-model";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { SchedaLavorazioniFields, SchedaRicambiFields } from "@/types/schede";
import type { CaptureSheetRowHint } from "@/components/lavorazioni/schede/scheda-fields-types";

export type { CaptureSheetFieldMeta, CaptureSheetRowHint } from "@/components/lavorazioni/schede/scheda-fields-types";

function fieldConfidence(rows: readonly CaptureFieldRow[], fieldKey: string): number | undefined {
  const row = rows.find((r) => r.field_key === fieldKey);
  if (!row || !("confidence" in row)) return undefined;
  const c = (row as { confidence?: number }).confidence;
  return typeof c === "number" ? c : undefined;
}

export function buildCaptureLavorazioniCompileData(input: {
  fieldRows: readonly CaptureFieldRow[];
  fields: SchedaLavorazioniFields;
  addettiRecords?: readonly AddettoRecord[];
  minConfidence?: number;
}): {
  fields: SchedaLavorazioniFields;
  hints: Record<string, CaptureSheetRowHint>;
  ocrBaseline: CaptureFieldPatch[];
} {
  const minConf = input.minConfidence ?? 0.75;
  const hints: Record<string, CaptureSheetRowHint> = {};
  const ocrBaseline = captureFieldRowsToOcrBaseline(input.fieldRows);

  input.fields.righe.forEach((row, idx) => {
    const n = idx + 1;
    const nomeKey = `riga_${n}_nome`;
    const nomeRaw = row.addettiAssegnati?.[0]?.addetto?.trim() ?? "";
    if (nomeRaw && input.addettiRecords?.length) {
      const rec = findAddettoByStoredName(input.addettiRecords, nomeRaw);
      if (!rec) {
        hints[nomeKey] = {
          tone: "catalog",
          message: "Addetto non trovato in anagrafica",
          meta: { fieldKey: nomeKey, source: "ocr", status: "WARNING" },
        };
      }
    }
    const conf = fieldConfidence(input.fieldRows, `riga_${n}_lavorazione`);
    if (conf !== undefined && conf < minConf && row.lavorazioniEffettuate.trim()) {
      hints[`riga_${n}_lavorazione`] = {
        tone: "suggested",
        message: `Confidence bassa (${Math.round(conf * 100)}%)`,
        meta: { fieldKey: `riga_${n}_lavorazione`, source: "ocr", confidence: conf, status: "WARNING" },
      };
    }
  });

  return { fields: input.fields, hints, ocrBaseline };
}

export function buildCaptureRicambiCompileData(input: {
  fieldRows: readonly CaptureFieldRow[];
  fields: SchedaRicambiFields;
  magazzino?: readonly RicambioMagazzino[];
  minConfidence?: number;
}): {
  fields: SchedaRicambiFields;
  hints: Record<string, CaptureSheetRowHint>;
  ocrBaseline: CaptureFieldPatch[];
} {
  const minConf = input.minConfidence ?? 0.75;
  const hints: Record<string, CaptureSheetRowHint> = {};
  const ocrBaseline = captureFieldRowsToOcrBaseline(input.fieldRows);
  const resolutions =
    input.magazzino?.length ? resolveRicambiRowsFromCaptureFields(input.fieldRows, input.magazzino) : [];

  input.fields.righe.forEach((row, idx) => {
    const n = idx + 1;
    const codiceKey = `riga_${n}_codice`;
    const resolved = resolutions.find((r) => r.rowIndex === n);
    if (resolved?.status === "NOT_FOUND" && row.codice.trim()) {
      hints[codiceKey] = {
        tone: "catalog",
        message: "Ricambio non trovato in magazzino",
        meta: { fieldKey: codiceKey, source: "ocr", status: "WARNING" },
      };
    } else if (resolved?.status === "AMBIGUOUS") {
      hints[codiceKey] = {
        tone: "ambiguous",
        message: "Più corrispondenze in magazzino",
        meta: { fieldKey: codiceKey, source: "ocr", status: "WARNING" },
      };
    }
    const conf = fieldConfidence(input.fieldRows, codiceKey);
    if (conf !== undefined && conf < minConf && row.codice.trim()) {
      hints[codiceKey] = {
        tone: "suggested",
        message: `Confidence bassa (${Math.round(conf * 100)}%)`,
        meta: { fieldKey: codiceKey, source: "ocr", confidence: conf, status: "WARNING" },
      };
    }
  });

  return { fields: input.fields, hints, ocrBaseline };
}

export function reconcileCaptureSheetHintAfterEdit(
  fieldKey: string,
  value: string,
  hint: CaptureSheetRowHint | undefined,
  opts?: { magazzino?: readonly RicambioMagazzino[]; addettiRecords?: readonly AddettoRecord[] },
): CaptureSheetRowHint | null {
  if (!hint) return null;
  const trimmed = value.trim();
  if (hint.tone === "catalog" && fieldKey.includes("_codice") && opts?.magazzino?.length) {
    const rowIndex = Number.parseInt(fieldKey.match(/riga_(\d+)_/)?.[1] ?? "0", 10);
    if (rowIndex > 0) {
      const fakeRows: CaptureFieldRow[] = [
        {
          field_key: fieldKey,
          confirmed_value: trimmed,
          normalized_value: trimmed,
        },
      ];
      const res = resolveRicambiRowsFromCaptureFields(fakeRows, opts.magazzino);
      if (res[0]?.status === "MATCHED") return null;
    }
  }
  if (hint.tone === "catalog" && fieldKey.includes("_nome") && opts?.addettiRecords?.length && trimmed) {
    if (findAddettoByStoredName(opts.addettiRecords, trimmed)) return null;
  }
  if (!trimmed && hint.meta.status === "WARNING") return null;
  return {
    ...hint,
    meta: { ...hint.meta, source: "user", status: trimmed ? "VALID" : "WARNING" },
  };
}

export function countCaptureSheetHintsNeedingReview(
  hints: Record<string, CaptureSheetRowHint>,
): number {
  return Object.values(hints).filter((h) => h.meta.status === "WARNING").length;
}

export function captureSheetHintsFromRows(
  tipo: "lavorazioni" | "ricambi",
  fieldRows: readonly CaptureFieldRow[],
  fields: SchedaLavorazioniFields | SchedaRicambiFields,
  opts?: { addettiRecords?: readonly AddettoRecord[]; magazzino?: readonly RicambioMagazzino[] },
): Record<string, CaptureSheetRowHint> {
  if (tipo === "lavorazioni") {
    return buildCaptureLavorazioniCompileData({
      fieldRows,
      fields: fields as SchedaLavorazioniFields,
      addettiRecords: opts?.addettiRecords,
    }).hints;
  }
  return buildCaptureRicambiCompileData({
    fieldRows,
    fields: fields as SchedaRicambiFields,
    magazzino: opts?.magazzino,
  }).hints;
}

export function rowHasOcrContent(fieldRows: readonly CaptureFieldRow[], rowNum: number): boolean {
  return Boolean(
    resolveRawFieldValue(
      fieldRows,
      `riga_${rowNum}_lavorazione`,
      `riga_${rowNum}_nome`,
      `riga_${rowNum}_codice`,
      `riga_${rowNum}_qt`,
    ),
  );
}
