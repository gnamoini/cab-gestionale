import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import {
  mapCaptureFieldsToLavorazioni,
  mapCaptureFieldsToRicambi,
  resolveRawFieldValue,
} from "@/lib/document-capture/capture-field-mapper";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { SchedaLavorazioniFields, SchedaRicambiFields } from "@/types/schede";

export type CaptureFieldPatch = {
  fieldKey: string;
  value: string | null;
  source: "ocr" | "user";
  action: "set" | "clear";
};

export type CaptureSchedaCompilePayload = {
  schemaVersion: 1;
  captureId: string;
  tipo: "lavorazioni" | "ricambi";
  fields: CaptureFieldPatch[];
  editedAt: string;
  operationId: string;
};

const MAX_LAV_RIGHE = 24;
const MAX_RIC_RIGHE = 24;

export function createCaptureOperationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function captureFieldRowsToOcrBaseline(
  rows: readonly CaptureFieldRow[],
): CaptureFieldPatch[] {
  const out: CaptureFieldPatch[] = [];
  for (const row of rows) {
    const value = (row.confirmed_value ?? row.normalized_value ?? row.raw_value ?? "").trim();
    if (!value) continue;
    out.push({
      fieldKey: row.field_key,
      value,
      source: "ocr",
      action: "set",
    });
  }
  return out;
}

export function captureFieldRowsToSchedaFields(
  tipo: "lavorazioni" | "ricambi",
  rows: readonly CaptureFieldRow[],
  opts?: { addettiRecords?: readonly AddettoRecord[]; magazzino?: readonly RicambioMagazzino[] },
): SchedaLavorazioniFields | SchedaRicambiFields {
  if (tipo === "lavorazioni") {
    return mapCaptureFieldsToLavorazioni(rows, opts?.addettiRecords);
  }
  return mapCaptureFieldsToRicambi(rows, opts?.magazzino, opts?.addettiRecords);
}

function formatOreForCapture(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  const rounded = Math.round(n * 1000) / 1000;
  return String(rounded);
}

export function schedaLavorazioniFieldsToCapturePatches(
  fields: SchedaLavorazioniFields,
  source: "ocr" | "user" = "user",
): CaptureFieldPatch[] {
  const out: CaptureFieldPatch[] = [];
  const ident = fields.identificazioneMacchina.trim();
  if (ident) {
    out.push({ fieldKey: "targa_matricola", value: ident, source, action: "set" });
  } else {
    out.push({ fieldKey: "targa_matricola", value: null, source, action: "clear" });
  }
  for (let n = 1; n <= MAX_LAV_RIGHE; n += 1) {
    const row = fields.righe[n - 1];
    if (!row) {
      out.push({ fieldKey: `riga_${n}_lavorazione`, value: null, source, action: "clear" });
      out.push({ fieldKey: `riga_${n}_nome`, value: null, source, action: "clear" });
      out.push({ fieldKey: `riga_${n}_ore`, value: null, source, action: "clear" });
      out.push({ fieldKey: `riga_${n}_data`, value: null, source, action: "clear" });
      continue;
    }
    const lav = row.lavorazioniEffettuate.trim();
    const addetto = row.addettiAssegnati?.[0]?.addetto?.trim() ?? "";
    const ore = row.addettiAssegnati?.[0]?.oreImpiegate ?? 0;
    const oreStr = formatOreForCapture(ore);
    const data = row.dataLavorazione.trim();
    const hasContent = lav || addetto || oreStr || data;
    if (!hasContent) {
      out.push({ fieldKey: `riga_${n}_lavorazione`, value: null, source, action: "clear" });
      out.push({ fieldKey: `riga_${n}_nome`, value: null, source, action: "clear" });
      out.push({ fieldKey: `riga_${n}_ore`, value: null, source, action: "clear" });
      out.push({ fieldKey: `riga_${n}_data`, value: null, source, action: "clear" });
      continue;
    }
    out.push({
      fieldKey: `riga_${n}_lavorazione`,
      value: lav || null,
      source,
      action: lav ? "set" : "clear",
    });
    out.push({
      fieldKey: `riga_${n}_nome`,
      value: addetto || null,
      source,
      action: addetto ? "set" : "clear",
    });
    out.push({
      fieldKey: `riga_${n}_ore`,
      value: oreStr || null,
      source,
      action: oreStr ? "set" : "clear",
    });
    out.push({
      fieldKey: `riga_${n}_data`,
      value: data || null,
      source,
      action: data ? "set" : "clear",
    });
  }
  return out;
}

export function schedaRicambiFieldsToCapturePatches(
  fields: SchedaRicambiFields,
  source: "ocr" | "user" = "user",
): CaptureFieldPatch[] {
  const out: CaptureFieldPatch[] = [];
  const ident = fields.identificazioneMacchina.trim();
  if (ident) {
    out.push({ fieldKey: "targa_matricola", value: ident, source, action: "set" });
  } else {
    out.push({ fieldKey: "targa_matricola", value: null, source, action: "clear" });
  }
  for (let n = 1; n <= MAX_RIC_RIGHE; n += 1) {
    const row = fields.righe[n - 1];
    if (!row) {
      for (const suffix of ["nome", "codice", "descrizione", "qt", "data"] as const) {
        out.push({ fieldKey: `riga_${n}_${suffix}`, value: null, source, action: "clear" });
      }
      continue;
    }
    const descrizione = row.ricambioNome.trim();
    const addetto = row.addetto.trim();
    const codice = row.codice.trim();
    const qt = row.quantita > 0 ? String(row.quantita) : "";
    const data = row.dataUtilizzo.trim();
    const hasContent = descrizione || addetto || codice || qt || data;
    if (!hasContent) {
      for (const suffix of ["nome", "codice", "descrizione", "qt", "data"] as const) {
        out.push({ fieldKey: `riga_${n}_${suffix}`, value: null, source, action: "clear" });
      }
      continue;
    }
    out.push({ fieldKey: `riga_${n}_nome`, value: addetto || null, source, action: addetto ? "set" : "clear" });
    out.push({ fieldKey: `riga_${n}_codice`, value: codice || null, source, action: codice ? "set" : "clear" });
    out.push({
      fieldKey: `riga_${n}_descrizione`,
      value: descrizione || null,
      source,
      action: descrizione ? "set" : "clear",
    });
    out.push({ fieldKey: `riga_${n}_qt`, value: qt || null, source, action: qt ? "set" : "clear" });
    out.push({ fieldKey: `riga_${n}_data`, value: data || null, source, action: data ? "set" : "clear" });
  }
  return out;
}

export function schedaFieldsToCompilePayload(
  tipo: "lavorazioni" | "ricambi",
  captureId: string,
  fields: SchedaLavorazioniFields | SchedaRicambiFields,
  opts?: { operationId?: string; source?: "ocr" | "user" },
): CaptureSchedaCompilePayload {
  const patches =
    tipo === "lavorazioni"
      ? schedaLavorazioniFieldsToCapturePatches(fields as SchedaLavorazioniFields, opts?.source ?? "user")
      : schedaRicambiFieldsToCapturePatches(fields as SchedaRicambiFields, opts?.source ?? "user");
  return {
    schemaVersion: 1,
    captureId,
    tipo,
    fields: patches,
    editedAt: new Date().toISOString(),
    operationId: opts?.operationId ?? createCaptureOperationId(),
  };
}

export function compilePayloadToCapturePatches(
  payload: CaptureSchedaCompilePayload,
): Array<{ fieldKey: string; confirmedValue: string | null; valueSource: "manual" }> {
  return payload.fields.map((p) => ({
    fieldKey: p.fieldKey,
    confirmedValue: p.action === "clear" ? null : p.value,
    valueSource: "manual" as const,
  }));
}

export function diffCapturePatches(
  baseline: readonly CaptureFieldPatch[],
  current: readonly CaptureFieldPatch[],
): CaptureFieldPatch[] {
  const baseMap = new Map(baseline.map((p) => [p.fieldKey, p]));
  const changed: CaptureFieldPatch[] = [];
  for (const patch of current) {
    const prev = baseMap.get(patch.fieldKey);
    if (!prev || prev.value !== patch.value || prev.action !== patch.action) {
      changed.push(patch);
    }
  }
  return changed;
}

export function schedaFieldsFromCompilePayload(
  payload: CaptureSchedaCompilePayload,
  opts?: { addettiRecords?: readonly AddettoRecord[]; magazzino?: readonly RicambioMagazzino[] },
): SchedaLavorazioniFields | SchedaRicambiFields {
  const rows: CaptureFieldRow[] = payload.fields.map((p) => ({
    field_key: p.fieldKey,
    confirmed_value: p.action === "clear" ? null : p.value,
    normalized_value: p.action === "clear" ? null : p.value,
    raw_value: p.action === "clear" ? null : p.value,
  }));
  return captureFieldRowsToSchedaFields(payload.tipo, rows, opts);
}

/** Round-trip via scheda fields for regression tests. */
export function roundTripSchedaCaptureFields(
  tipo: "lavorazioni" | "ricambi",
  rows: readonly CaptureFieldRow[],
  opts?: { addettiRecords?: readonly AddettoRecord[]; magazzino?: readonly RicambioMagazzino[] },
): { fields: SchedaLavorazioniFields | SchedaRicambiFields; patches: CaptureFieldPatch[] } {
  const fields = captureFieldRowsToSchedaFields(tipo, rows, opts);
  const patches =
    tipo === "lavorazioni"
      ? schedaLavorazioniFieldsToCapturePatches(fields as SchedaLavorazioniFields, "ocr")
      : schedaRicambiFieldsToCapturePatches(fields as SchedaRicambiFields, "ocr");
  return { fields, patches };
}

export function hasCaptureRowContent(rows: readonly CaptureFieldRow[], rowIndex: number): boolean {
  const n = rowIndex;
  return Boolean(
    resolveRawFieldValue(rows, `riga_${n}_lavorazione`, `riga_${n}_nome`, `riga_${n}_codice`, `riga_${n}_qt`),
  );
}
