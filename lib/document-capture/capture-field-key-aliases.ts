import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import { isoToItDisplay, ymdToItDisplay } from "@/lib/lavorazioni/date-day-only";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { parseItalianDayDisplayToIso } from "@/lib/ui/italian-date-input-mask";
import type { HybridFieldSource } from "@/lib/document-capture/extraction/hybrid-extraction-types";
import {
  findExactEntityInPool,
  fuzzyMatchEntity,
} from "@/lib/validation/global-entity-validation";

export function normCaptureFieldKey(key: string): string {
  return key.trim().toLowerCase().replace(/^ingresso\./, "");
}

/** Alias chiavi AI/OCR → chiavi CAB (scheda ingresso). */
export function normalizeCaptureExtractedFieldKey(rawKey: string): string {
  const k = normCaptureFieldKey(rawKey);
  if (k === "attrezzatura") return "tipo_attrezzatura";
  const spaced = k.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (spaced === "data ingresso" || spaced === "data di ingresso") return "data_ingresso";
  return k;
}

/** Valore data scheda ingresso → gg/mm/aaaa (IT). */
export function normalizeCaptureIngressoDateValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const parsed = parseItalianDayDisplayToIso(trimmed);
  if (parsed.ok) return isoToItDisplay(parsed.iso);
  const fromYmd = ymdToItDisplay(trimmed.slice(0, 10));
  if (fromYmd) return fromYmd;
  return trimmed;
}

function captureIngressoDateIso(display: string): string | null {
  const parsed = parseItalianDayDisplayToIso(display);
  return parsed.ok ? parsed.iso : null;
}

/** Scarta data_ingresso = oggi quando probabile fallback OCR/AI (non data scritta sul foglio). */
export function rejectCaptureIngressoDateIfLikelyTodayFallback(
  raw: string,
  opts?: { confidence?: number; source?: HybridFieldSource },
): string {
  const normalized = normalizeCaptureIngressoDateValue(raw);
  if (!normalized) return "";
  const todayIso = captureIngressoDateIso(new Date().toLocaleDateString("it-IT"));
  const valueIso = captureIngressoDateIso(normalized);
  if (!todayIso || !valueIso || todayIso !== valueIso) return normalized;

  const confidence = opts?.confidence ?? 1;
  const source = opts?.source;
  if (confidence < 0.7) return "";
  if (source === "template_ocr" || source === "gemini") return "";
  if (source === "pdf_text" && confidence < 0.85) return "";
  return normalized;
}

/** Filtra rumore OCR/Gemini su celle piccole (es. n_scuderia vuota → "7"). */
export function sanitizeCaptureExtractedFieldValue(key: string, value: string): string {
  const k = normCaptureFieldKey(normalizeCaptureExtractedFieldKey(key));
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (k === "n_scuderia" || k === "nscuderia" || k === "numero_scuderia") {
    // ponytail: singola cifra = frammento etichetta "N." / rumore bbox; scuderia reale ≥2 char
    if (/^\d$/.test(trimmed)) return "";
    if (/^[.|\-–:;|Il1oO]$/.test(trimmed)) return "";
  }
  return trimmed;
}

const TIPO_ATTREZZATURA_KEYS = new Set(["tipo_attrezzatura", "tipoattrezzatura", "attrezzatura"]);

function captureRowText(row: CaptureFieldRow): string {
  const v = row.confirmed_value ?? row.normalized_value ?? row.raw_value ?? "";
  return typeof v === "string" ? v.trim() : "";
}

function hasIngressoTipoAttrezzaturaValue(rows: readonly CaptureFieldRow[]): boolean {
  return rows.some((r) => TIPO_ATTREZZATURA_KEYS.has(normCaptureFieldKey(r.field_key)) && captureRowText(r));
}

/**
 * Corregge utilizzatore popolato con un tipo attrezzatura (es. SPAZZATRICE su etichetta «Attrezzatura»).
 * ponytail: match catalogo tipi vs utilizzatori — upgrade: hint layout/template bbox.
 */
export function repairMisassignedIngressoCaptureFields<T extends CaptureFieldRow>(
  rows: readonly T[],
  mezziListe?: MezziListePrefs,
): T[] {
  const next = rows.map((row) => ({
    ...row,
    field_key: normalizeCaptureExtractedFieldKey(row.field_key),
  }));
  if (!mezziListe || hasIngressoTipoAttrezzaturaValue(next)) return next;

  const utilIdx = next.findIndex((r) => normCaptureFieldKey(r.field_key) === "utilizzatore");
  if (utilIdx < 0) return next;

  const utilVal = captureRowText(next[utilIdx]!);
  if (!utilVal) return next;

  const tipi = mezziListe.tipiAttrezzatura ?? [];
  const utilizzatori = mezziListe.utilizzatori ?? [];
  const inTipi = findExactEntityInPool(utilVal, tipi);
  const inUtil = findExactEntityInPool(utilVal, utilizzatori);

  let canonicalTipo: string | null = null;
  if (inTipi && !inUtil) {
    canonicalTipo = inTipi;
  } else if (!inUtil && tipi.length > 0) {
    const tipoHit = fuzzyMatchEntity(utilVal, tipi, { includeExact: true, minScore: 80 });
    const utilHit = fuzzyMatchEntity(utilVal, utilizzatori, { includeExact: true, minScore: 80 });
    if (tipoHit && (!utilHit || tipoHit.score > utilHit.score)) {
      canonicalTipo = tipoHit.entity;
    }
  }

  if (!canonicalTipo) return next;

  const repaired = [...next];
  repaired[utilIdx] = {
    ...repaired[utilIdx]!,
    field_key: "tipo_attrezzatura",
    raw_value: utilVal,
    normalized_value: canonicalTipo,
    confirmed_value: repaired[utilIdx]!.confirmed_value ?? canonicalTipo,
  };
  return repaired;
}

export function normalizeIngressoCaptureFieldRows<T extends CaptureFieldRow>(
  rows: readonly T[],
  mezziListe?: MezziListePrefs,
): T[] {
  return repairMisassignedIngressoCaptureFields(
    rows.map((row) => {
      const field_key = normalizeCaptureExtractedFieldKey(row.field_key);
      const text = captureRowText({ ...row, field_key });
      if (normCaptureFieldKey(field_key) === "data_ingresso") {
        if (!text) return { ...row, field_key };
        const normalized = normalizeCaptureIngressoDateValue(text);
        return {
          ...row,
          field_key,
          normalized_value: normalized,
          confirmed_value: row.confirmed_value ?? normalized,
        };
      }
      if (!text) return { ...row, field_key };
      const sanitized = sanitizeCaptureExtractedFieldValue(field_key, text);
      if (!sanitized) {
        return {
          ...row,
          field_key,
          raw_value: "",
          normalized_value: "",
          confirmed_value: row.confirmed_value ? "" : row.confirmed_value,
        };
      }
      if (sanitized === text) return { ...row, field_key };
      return {
        ...row,
        field_key,
        normalized_value: sanitized,
        confirmed_value: row.confirmed_value ?? sanitized,
      };
    }),
    mezziListe,
  );
}
