import {
  addettoDisplayName,
  findAddettoByStoredName,
  type AddettoRecord,
} from "@/lib/lavorazioni/addetto-model";
import { isCaptureSignatureFieldKey } from "@/lib/document-capture/capture-signature-field-keys";
import type { EntityResolutionResult } from "@/lib/entity-resolution/entity-resolution-types";
import { hasSignatureDataUrl } from "@/lib/media/signature-pad";

function normFieldKey(key: string): string {
  return key.trim().toLowerCase().replace(/^ingresso\./, "");
}

function safeTrim(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

const TARGA_FIELD_KEYS = new Set(["targa", "targa_matricola", "targamatricola", "targa/matricola"]);

export function isCaptureTargaFieldKey(fieldKey: string): boolean {
  return TARGA_FIELD_KEYS.has(normFieldKey(fieldKey));
}

export function isCapturePersonNameFieldKey(fieldKey: string): boolean {
  const key = normFieldKey(fieldKey);
  if (key === "addetto_accettazione" || key === "addettoaccettazione") return true;
  return /^riga_\d+_nome$/.test(key);
}

const PROPER_LABEL_FIELD_KEYS = new Set([
  "cliente",
  "cantiere",
  "utilizzatore",
  "fornitore",
  "marca_attrezzatura",
  "marcaattrezzatura",
  "attrezzatura_marca",
  "modello_attrezzatura",
  "modelloattrezzatura",
  "attrezzatura_modello",
  "marca_telaio",
  "modello_telaio",
  "marca",
  "modello",
]);

export function isCaptureProperLabelFieldKey(fieldKey: string): boolean {
  return PROPER_LABEL_FIELD_KEYS.has(normFieldKey(fieldKey));
}

function normalizeForCaptureCasingCompare(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

/** Se raw e value hanno lo stesso significato (punteggiatura/casing), preferisci raw OCR. */
function preferRawIfSameMeaning(raw: string, value: string): string | null {
  if (!raw || !value) return null;
  if (normalizeForCaptureCasingCompare(raw) === normalizeForCaptureCasingCompare(value)) {
    return raw;
  }
  return null;
}

function formatLegalSuffixToken(token: string): string | null {
  const compact = token.replace(/\./g, "").toLowerCase();
  const map: Record<string, string> = {
    spa: "S.p.A.",
    srl: "S.r.l.",
    snc: "S.n.c.",
    sas: "S.a.s.",
    scarl: "S.c.a.r.l.",
  };
  return map[compact] ?? null;
}

/** Cliente / cantiere / … senza match catalogo: Impresa Edile Rossi spa → Impresa Edile Rossi S.p.A. */
export function formatCaptureProperLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => formatLegalSuffixToken(token) ?? formatTitleCaseToken(token))
    .join(" ");
}

/** Targa: maiuscolo, senza spazi. */
export function formatCaptureTargaValue(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

function formatTitleCaseToken(token: string): string {
  const t = token.trim();
  if (!t) return "";
  if (/^[a-zA-Z]\.?$/.test(t)) {
    return t.charAt(0).toUpperCase() + (t.includes(".") ? "." : "");
  }
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** MARIO / mario / mArio b. → Mario B. */
export function formatCapturePersonName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map(formatTitleCaseToken)
    .join(" ");
}

function normalizePersonCompare(value: string): string {
  return value.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
}

/** Risolve nome addetto da impostazioni (es. Donato → Donato Macina). */
export function matchCapturePersonNameFromAddetti(
  value: string,
  addettiRecords: readonly AddettoRecord[],
): string | null {
  const trimmed = value.trim();
  if (!trimmed || addettiRecords.length === 0) return null;

  const direct = findAddettoByStoredName(addettiRecords, trimmed);
  if (direct) return addettoDisplayName(direct);

  const tokens = normalizePersonCompare(trimmed).split(" ").filter(Boolean);
  if (tokens.length === 0) return null;
  const first = tokens[0]!;

  const candidates = addettiRecords.filter((rec) => {
    if (rec.nome.trim().toLowerCase() !== first) return false;
    if (tokens.length === 1) return true;
    const cognome = rec.cognome?.trim();
    if (!cognome) return false;
    const cognomeNorm = normalizePersonCompare(cognome);
    const second = tokens[1]!;
    return cognomeNorm === second || cognomeNorm.startsWith(second);
  });

  if (candidates.length === 1) return addettoDisplayName(candidates[0]!);
  return null;
}

export function formatCaptureReviewDisplayValue(
  fieldKey: string,
  input: {
    raw?: string | null;
    normalized?: string | null;
    confirmed?: string | null;
    resolvedLabel?: string | null;
  },
  opts?: { addettiRecords?: readonly AddettoRecord[] },
): string {
  const key = normFieldKey(fieldKey);
  if (isCaptureMultilineFieldKey(key)) {
    const confirmed = safeTrim(input.confirmed);
    const raw = safeTrim(input.raw);
    const normalized = safeTrim(input.normalized);
    const resolved = safeTrim(input.resolvedLabel);
    if (confirmed) {
      const fromRaw = raw ? preferRawIfSameMeaning(raw, confirmed) : null;
      return fromRaw ?? confirmed;
    }
    const candidate = normalized || raw;
    const fromRaw = raw && candidate ? preferRawIfSameMeaning(raw, candidate) : null;
    if (fromRaw) return fromRaw;
    return raw || normalized || resolved;
  }
  if (isCaptureSignatureFieldKey(key)) {
    const v = safeTrim(input.confirmed) || safeTrim(input.normalized) || safeTrim(input.raw);
    return hasSignatureDataUrl(v) ? v : "";
  }
  const raw = safeTrim(input.raw);
  const confirmed = safeTrim(input.confirmed);
  const normalized = safeTrim(input.normalized);
  const resolved = safeTrim(input.resolvedLabel);

  if (confirmed) {
    if (isCaptureTargaFieldKey(key)) return formatCaptureTargaValue(confirmed);
    if (isCapturePersonNameFieldKey(key)) {
      return (
        matchCapturePersonNameFromAddetti(confirmed, opts?.addettiRecords ?? []) ??
        formatCapturePersonName(confirmed)
      );
    }
    if (isCaptureProperLabelFieldKey(key)) return formatCaptureProperLabel(confirmed);
    return confirmed;
  }

  if (isCaptureTargaFieldKey(key)) {
    return formatCaptureTargaValue(resolved || normalized || raw);
  }

  if (resolved) return resolved;

  const source = raw || normalized;
  if (isCapturePersonNameFieldKey(key) && source) {
    return (
      matchCapturePersonNameFromAddetti(source, opts?.addettiRecords ?? []) ??
      formatCapturePersonName(source)
    );
  }

  const value = normalized || raw;
  const fromRaw = raw && value ? preferRawIfSameMeaning(raw, value) : null;
  if (fromRaw) return fromRaw;

  if (isCaptureProperLabelFieldKey(key) && value) {
    return formatCaptureProperLabel(value);
  }

  return value;
}

export function formatCaptureReviewDraftValue(
  fieldKey: string,
  value: string,
  opts?: { addettiRecords?: readonly AddettoRecord[] },
): string {
  if (isCaptureSignatureFieldKey(fieldKey)) {
    return hasSignatureDataUrl(value) ? value.trim() : "";
  }
  if (isCaptureMultilineFieldKey(fieldKey)) {
    return value.trim();
  }
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (isCaptureTargaFieldKey(fieldKey)) return formatCaptureTargaValue(trimmed);
  if (isCapturePersonNameFieldKey(fieldKey)) {
    return (
      matchCapturePersonNameFromAddetti(trimmed, opts?.addettiRecords ?? []) ??
      formatCapturePersonName(trimmed)
    );
  }
  if (isCaptureProperLabelFieldKey(fieldKey)) return formatCaptureProperLabel(trimmed);
  return trimmed;
}

export function applyCaptureResolutionToDraft(
  draft: Record<string, string>,
  baseline: Record<string, string>,
  resolutionByKey: Record<string, EntityResolutionResult>,
  opts?: { onlyUnedited?: boolean; addettiRecords?: readonly AddettoRecord[] },
): { draft: Record<string, string>; baseline: Record<string, string>; changed: boolean } {
  const onlyUnedited = opts?.onlyUnedited ?? false;
  const addettiRecords = opts?.addettiRecords;
  const nextDraft = { ...draft };
  const nextBaseline = { ...baseline };
  let changed = false;

  for (const [fieldKey, resolution] of Object.entries(resolutionByKey)) {
    if (resolution.status !== "resolved" || !resolution.resolvedLabel) continue;
    const resolvedDraft = formatCaptureReviewDraftValue(fieldKey, resolution.resolvedLabel, { addettiRecords });
    const cur = formatCaptureReviewDraftValue(fieldKey, draft[fieldKey] ?? "", { addettiRecords });
    const base = formatCaptureReviewDraftValue(fieldKey, baseline[fieldKey] ?? "", { addettiRecords });
    if (onlyUnedited && cur !== base) continue;
    if (cur === resolvedDraft) continue;
    nextDraft[fieldKey] = resolvedDraft;
    nextBaseline[fieldKey] = resolvedDraft;
    changed = true;
  }

  return changed ? { draft: nextDraft, baseline: nextBaseline, changed } : { draft, baseline, changed: false };
}

const MULTILINE_CAPTURE_FIELD_KEYS = new Set([
  "descrizione_anomalia",
  "descrizioneanomalia",
  "note_intervento",
  "noteintervento",
]);

export function isCaptureMultilineFieldKey(fieldKey: string): boolean {
  return MULTILINE_CAPTURE_FIELD_KEYS.has(normFieldKey(fieldKey));
}
