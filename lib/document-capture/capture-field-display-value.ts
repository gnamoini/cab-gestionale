import {
  addettoDisplayName,
  findAddettoByStoredName,
  type AddettoRecord,
} from "@/lib/lavorazioni/addetto-model";
import {
  isCaptureSignatureFieldKey,
  pickCaptureSignatureDataUrl,
} from "@/lib/document-capture/capture-signature-field-keys";
import {
  formatCaptureLavorazioniText,
  isCaptureLavorazioneFieldKey,
} from "@/lib/document-capture/capture-lavorazioni-text";
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
  "tipo_attrezzatura",
  "tipoattrezzatura",
  "attrezzatura",
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

/** AI/JSON a volte restituisce a capo come sequenza letterale \\n invece di LF. */
export function unescapeCaptureLiteralNewlines(value: string): string {
  return value.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "\r");
}

const WORKSHOP_LINE_CONJUNCTION =
  "(?:E|O|ED|Ma|MA|Però|PERÒ|PERO|Quindi|QUINDI|Inoltre|INOLTRE|Poi|POI|Oppure|OPPURE)";

const WORKSHOP_ABBREV_BEFORE_PERIOD_RE = /\b(?:IMP|N|NR|COD|QT|CC|CV|CAB|PTO|OK)\.$/i;

/** Unisce a capo OCR spurii prima di congiunzioni coordinate (es. «…\nE nel vano» → «… e nel vano»). */
export function joinSpuriousWorkshopLineBreaks(text: string): string {
  let out = text.replace(/\r\n/g, "\n");
  out = out.replace(
    new RegExp(`(\\S)\\s*\\n\\s*(${WORKSHOP_LINE_CONJUNCTION})\\s+`, "gi"),
    (_, before: string, conj: string) => `${before} ${conj.toLocaleLowerCase("it-IT")} `,
  );
  out = out.replace(/(?<=\S)\s+\bE\b\s+(?=\S)/g, " e ");
  out = out.replace(/(?<=\S)\s+\bO\b\s+(?=\S)/g, " o ");
  out = out.replace(/(?<=\S)\s+\bED\b\s+(?=[AEIOUÀÈÉÌÒÙaeiouàèéìòù])/g, " ed ");
  return out;
}

function shouldKeepFlatAfterPunctuation(headThroughPunct: string, tail: string): boolean {
  if (/^E\s+\S/i.test(tail) || /^O\s+\S/i.test(tail)) return true;
  return WORKSHOP_ABBREV_BEFORE_PERIOD_RE.test(headThroughPunct.trimEnd());
}

/** Ripristina a capo quando l'estrazione ha appiattito righe separate sulla scheda. */
export function inferCaptureMultilineBreaks(value: string): string {
  const joined = joinSpuriousWorkshopLineBreaks(unescapeCaptureLiteralNewlines(value).trim());
  if (!joined) return "";
  if (/\n/.test(joined)) return joined;
  return joined.replace(/([.!?])\s+(?=[A-ZÀ-ÖØ-Þ*•\-])/g, (full, punct, offset, str) => {
    const head = str.slice(0, offset + 1);
    const tail = str.slice(offset + full.length);
    if (shouldKeepFlatAfterPunctuation(head, tail)) return `${punct} `;
    return `${punct}\n`;
  });
}

/** Correzioni refuso OCR frequenti su note officina — nessuna chiamata AI aggiuntiva. */
export function polishCaptureWorkshopOcrText(value: string): string {
  let text = joinSpuriousWorkshopLineBreaks(value.replace(/\r\n/g, "\n"));
  text = text.replace(/\*\*/g, "");
  // Frammenti spezzati su due righe (es. "di supp" + "Da.")
  text = text.replace(/\bdi supp\s*\n\s*Da\.\s*/gi, "di supporto da. ");
  text = text.replace(/\bCompleta di supp\s*\n\s*Da\.\s*/gi, "Completa di supporto da. ");
  text = text.replace(/\bdi supp\b/gi, "di supporto");
  text = text.replace(/\bCompleta di supp\b/gi, "Completa di supporto");

  const wordFixes: Array<[RegExp, string]> = [
    [/\bXn\./g, "N."],
    [/\bxn\./g, "n."],
    [/\bIn (\d+) kit\b/gi, "N. $1 kit"],
    [/\baspirae\b/gi, "aspirazione"],
    [/\baspiratione\b/gi, "aspirazione"],
    [/\bbocca aspirae\b/gi, "bocca aspirazione"],
    [/\bcor verificare\b/gi, "per verificare"],
    [/\bcor\s+verificare\b/gi, "per verificare"],
    [/\bgia[''`´]/gi, "già"],
    [/\bverificare\)\b/gi, "verificare"],
    [/\s+\)\s*$/gm, ""],
    [/\bN ugelli\b/gi, "N. ugelli"],
    [/\bN\.1\b/g, "n. 1"],
  ];
  for (const [pattern, replacement] of wordFixes) {
    text = text.replace(pattern, replacement);
  }
  // Segnaposto "ok" a fine voce (checklist manoscritta)
  text = text.replace(/\bok\b/gi, "OK");
  return text;
}

const WORKSHOP_ALL_CAPS_WORD_ALLOWLIST = new Set(["OK", "N"]);

/** Parole OCR tutte maiuscole nel mezzo di una frase mista → minuscole (es. «Già SOSTITUITA»). */
function lowerWorkshopAllCapsWords(text: string): string {
  return text.replace(/\b([A-ZÀ-ÖØ-Þ]+)([.,;:!?]?)\b/g, (full, letters, punct) => {
    if (WORKSHOP_ALL_CAPS_WORD_ALLOWLIST.has(letters)) return full;
    if ((letters === "E" || letters === "O") && letters.length === 1) {
      return letters.toLocaleLowerCase("it-IT") + punct;
    }
    if (letters.length < 2) return full;
    if (letters !== letters.toUpperCase()) return full;
    return letters.toLocaleLowerCase("it-IT") + punct;
  });
}

/** Nuova frase solo se dopo il punto segue parola con maiuscola + minuscole (evita «IMP. ELETTRICO»). */
const WORKSHOP_SENTENCE_SPLIT_RE =
  /(?<=[.!?])(?<!\b(?:IMP|N|NR|COD|QT|CC|CV|CAB|PTO|OK)\.)\s+(?=[A-ZÀ-ÖØ-Þ][a-zà-ö])/u;

function capitalizeMultilineToken(text: string): string {
  const t = lowerWorkshopAllCapsWords(text.trim());
  if (!t) return "";
  const normalized =
    t === t.toUpperCase() && /[A-ZÀ-ÖØ-Þ]/.test(t) ? t.toLocaleLowerCase("it-IT") : t;
  return normalized.charAt(0).toLocaleUpperCase("it-IT") + normalized.slice(1);
}

function capitalizeMultilineFragment(fragment: string): string {
  const trimmed = fragment.trim();
  if (!trimmed) return "";
  const bullet = /^([*•\-–]\s+)([\s\S]*)$/.exec(trimmed);
  if (bullet) {
    return `${bullet[1]}${capitalizeMultilineToken(bullet[2] ?? "")}`;
  }
  return capitalizeMultilineToken(trimmed);
}

/** Testo multilinea da OCR: conserva a capo, corregge refusi officina, normalizza maiuscole. */
export function formatCaptureMultilineText(value: string): string {
  const withBreaks = inferCaptureMultilineBreaks(unescapeCaptureLiteralNewlines(value));
  const polished = polishCaptureWorkshopOcrText(withBreaks);
  const trimmed = polished.trim();
  if (!trimmed) return "";
  const lines = trimmed.split(/\r?\n/).map((line) => line.trim());
  const parts = lines.some((line) => line.length > 0) ? lines.filter((line) => line.length > 0) : [trimmed];
  return parts.map(formatCaptureMultilineLine).join("\n");
}

function formatCaptureMultilineLine(line: string): string {
  const collapsed = line.replace(/[^\S\n]+/g, " ").trim();
  if (!collapsed) return "";
  return collapsed
    .split(WORKSHOP_SENTENCE_SPLIT_RE)
    .map((sentence) => capitalizeMultilineFragment(sentence))
    .filter(Boolean)
    .join(" ");
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
    let picked = "";
    if (confirmed) {
      const fromRaw = raw ? preferRawIfSameMeaning(raw, confirmed) : null;
      picked = fromRaw ?? confirmed;
    } else {
      const candidate = normalized || raw;
      const fromRaw = raw && candidate ? preferRawIfSameMeaning(raw, candidate) : null;
      if (fromRaw) picked = fromRaw;
      else picked = raw || normalized || resolved;
    }
    return isCaptureLavorazioneFieldKey(key)
      ? formatCaptureLavorazioniText(picked)
      : formatCaptureMultilineText(picked);
  }
  if (isCaptureSignatureFieldKey(key)) {
    return pickCaptureSignatureDataUrl(input.raw, input.confirmed, input.normalized);
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
    return isCaptureLavorazioneFieldKey(fieldKey)
      ? formatCaptureLavorazioniText(value.trim())
      : formatCaptureMultilineText(value.trim());
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
  "note",
  "note_intervento",
  "noteintervento",
]);

export function isCaptureMultilineFieldKey(fieldKey: string): boolean {
  const key = normFieldKey(fieldKey);
  if (MULTILINE_CAPTURE_FIELD_KEYS.has(key)) return true;
  return /^riga_\d+_lavorazione$/.test(key);
}
