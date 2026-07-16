import type { CaptureExtractionResult } from "@/lib/document-capture/capture-extraction-schema";
import {
  formatCaptureMultilineText,
  isCaptureMultilineFieldKey,
} from "@/lib/document-capture/capture-field-display-value";
import {
  SCHEDA_OFFICINA_EXTRACTION_USER,
  SCHEDA_OFFICINA_HYBRID_PREFILL_USER_PREFIX,
} from "@/lib/document-capture/scheda-officina-extraction-prompt";
import { sanitizeCaptureExtractedFieldValue } from "@/lib/document-capture/capture-field-key-aliases";
import type { DetectedSchedaBlankTipo, HybridField, HybridFieldSource } from "@/lib/document-capture/extraction/hybrid-extraction-types";

const SOURCE_PRIORITY: Record<HybridFieldSource, number> = {
  template_ocr: 3,
  pdf_text: 2,
  gemini: 1,
};

const CRITICAL_CONFIDENCE = 0.45;

function fieldValue(f: HybridField): string {
  return (f.value ?? "").trim();
}

function isFilled(f: HybridField): boolean {
  return fieldValue(f).length > 0;
}

export function mergeHybridFields(layers: HybridField[][]): HybridField[] {
  const byKey = new Map<string, HybridField>();
  for (const layer of layers) {
    for (const field of layer) {
      const key = field.key;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, field);
        continue;
      }
      const existingFilled = isFilled(existing);
      const incomingFilled = isFilled(field);
      if (!existingFilled && incomingFilled) {
        byKey.set(key, field);
        continue;
      }
      if (existingFilled && !incomingFilled) continue;
      if (field.confidence > existing.confidence) {
        byKey.set(key, field);
        continue;
      }
      if (field.confidence === existing.confidence && SOURCE_PRIORITY[field.source] > SOURCE_PRIORITY[existing.source]) {
        byKey.set(key, field);
      }
    }
  }
  return [...byKey.values()];
}

function hasCriticalIngressoFields(fields: HybridField[]): boolean {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const dataIngresso = byKey.get("data_ingresso");
  const cliente = byKey.get("cliente");
  const tipoAtt = byKey.get("tipo_attrezzatura");
  const marca = byKey.get("attrezzatura_marca");
  if (!dataIngresso || !isFilled(dataIngresso) || dataIngresso.confidence < CRITICAL_CONFIDENCE) return false;
  if (!cliente || !isFilled(cliente) || cliente.confidence < CRITICAL_CONFIDENCE) return false;
  const hasAttrezzatura =
    (tipoAtt && isFilled(tipoAtt) && tipoAtt.confidence >= CRITICAL_CONFIDENCE) ||
    (marca && isFilled(marca) && marca.confidence >= CRITICAL_CONFIDENCE);
  return Boolean(hasAttrezzatura);
}

function hasTableRow(fields: HybridField[]): boolean {
  return fields.some((f) => /^riga_\d+_/.test(f.key) && isFilled(f) && f.confidence >= CRITICAL_CONFIDENCE);
}

function hasCriticalLavorazioniRicambiFields(fields: HybridField[]): boolean {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const cliente = byKey.get("cliente");
  const targa = byKey.get("targa_matricola");
  const clienteOk = Boolean(cliente && isFilled(cliente) && cliente.confidence >= CRITICAL_CONFIDENCE);
  const targaOk = Boolean(targa && isFilled(targa) && targa.confidence >= CRITICAL_CONFIDENCE);
  return clienteOk && (targaOk || hasTableRow(fields));
}

export function needsGeminiFallback(
  merged: HybridField[],
  schedaTipo: DetectedSchedaBlankTipo | null,
): boolean {
  if (!schedaTipo) return true;
  if (merged.length === 0) return true;
  if (schedaTipo === "ingresso") return !hasCriticalIngressoFields(merged);
  return !hasCriticalLavorazioniRicambiFields(merged);
}

export function buildGeminiPrefillPrompt(merged: HybridField[]): string {
  const prefill = merged
    .filter((f) => isFilled(f))
    .map((f) => ({ key: f.key, value: f.value, confidence: f.confidence, source: f.source }));
  if (prefill.length === 0) return SCHEDA_OFFICINA_EXTRACTION_USER;
  return `${SCHEDA_OFFICINA_HYBRID_PREFILL_USER_PREFIX}\n${JSON.stringify(prefill, null, 2)}`;
}

export function hybridFieldsToCaptureExtraction(
  merged: HybridField[],
  schedaTipo: DetectedSchedaBlankTipo | null,
): CaptureExtractionResult {
  return {
    schedaTipo: schedaTipo ?? undefined,
    fields: merged
      .filter((f) => isFilled(f))
      .map((f) => ({
        key: f.key,
        value: formatHybridMultilineFieldValue(f.key, f.value),
        confidence: f.confidence,
      })),
    warnings: merged.length === 0 ? ["Nessun campo letto da OCR/PDF text"] : undefined,
  };
}

export function mergeWithGeminiFields(prefill: HybridField[], geminiFields: HybridField[]): HybridField[] {
  return mergeHybridFields([prefill, geminiFields]);
}

export function captureResultToHybridFields(
  fields: Array<{ key: string; value: string | null; confidence: number }>,
): HybridField[] {
  return fields.map((f) => ({
    key: f.key,
    value: formatHybridMultilineFieldValue(f.key, f.value),
    confidence: f.confidence,
    source: "gemini" as const,
  }));
}

function formatHybridMultilineFieldValue(key: string, value: string | null): string | null {
  if (!value?.trim()) return value;
  const sanitized = sanitizeCaptureExtractedFieldValue(key, value);
  if (!sanitized) return null;
  if (!isCaptureMultilineFieldKey(key)) return sanitized;
  return formatCaptureMultilineText(sanitized);
}
