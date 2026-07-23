import {
  formatCaptureMultilineText,
  unescapeCaptureLiteralNewlines,
} from "@/lib/document-capture/capture-field-display-value";

const BULLET_PREFIX_RE = /^[*•\-–]\s+/;

/** Righe OCR che sono solo abbreviazione → forma estesa. */
const STANDALONE_LINE_ABBREVS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^smont\.?$/i, "Smontaggio"],
  [/^mont\.?$/i, "Montaggio"],
  [/^sost\.?$/i, "Sostituzione"],
  [/^verif\.?$/i, "Verifica"],
  [/^contr\.?$/i, "Controllo"],
  [/^rip\.?$/i, "Riparazione"],
  [/^isol\.?$/i, "Isolamento"],
  [/^e\s+isol\.?$/i, "E isolamento"],
];

const INLINE_WORKSHOP_ABBREVS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bimp\.\s*(?=elettric|idraul|pneumat|oleodin)/gi, "impianto "],
  [/\bimp\.\b/gi, "impianto"],
  [/\bsmont\.\b/gi, "Smontaggio"],
  [/\bmont\.\b/gi, "Montaggio"],
  [/\bsost\.\b/gi, "Sostituzione"],
  [/\bverif\.\b/gi, "Verifica"],
  [/\bcontr\.\b/gi, "Controllo"],
  [/\brip\.\b/gi, "Riparazione"],
  [/\bisol\.\b/gi, "isolamento"],
  [/\be\s+isol\.\b/gi, "e isolamento"],
  [/\bpto\b/g, "PTO"],
];

export function expandCaptureWorkshopAbbreviations(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const body = line.replace(BULLET_PREFIX_RE, "").trim();
      if (!body) return "";
      for (const [pattern, replacement] of STANDALONE_LINE_ABBREVS) {
        if (pattern.test(body)) return replacement;
      }
      let out = body;
      for (const [pattern, replacement] of INLINE_WORKSHOP_ABBREVS) {
        out = out.replace(pattern, replacement);
      }
      return out;
    })
    .join("\n");
}

const WORKSHOP_VERB_HEAD_RE =
  /^(Smontaggio|Montaggio|Sostituzione|Verifica|Controllo|Riparazione|Isolamento)\b/i;

/** Riga OCR spezzata che continua la voce precedente (es. «N. 2 …», «E isol.»). */
function isLavorazioniContinuationLine(line: string): boolean {
  const t = line.trim();
  if (/^e\s+/i.test(t)) return true;
  if (/^n\.?\s*[\d]/i.test(t)) return true;
  if (/^nr\.?\s*[\d]/i.test(t)) return true;
  return false;
}

function canAbsorbWorkshopContinuation(prev: string): boolean {
  return WORKSHOP_VERB_HEAD_RE.test(prev.trim());
}

function joinWorkshopContinuationLine(head: string, tail: string): string {
  let t = tail.trim();
  if (/^e\s+/i.test(t)) {
    t = `e ${t.slice(1).trim()}`;
  }
  return `${head.trim()} ${t}`.replace(/\s+/g, " ").trim();
}

/** Unisce voci spezzate dall'OCR (Smont. + N. 2 … + E isol.). */
export function coalesceCaptureLavorazioniLines(lines: readonly string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const prev = out[out.length - 1];
    if (prev && canAbsorbWorkshopContinuation(prev) && isLavorazioniContinuationLine(trimmed)) {
      out[out.length - 1] = joinWorkshopContinuationLine(prev, trimmed);
      continue;
    }
    out.push(trimmed);
  }
  return out;
}

/** Ogni riga non vuota inizia con «- » se il testo è multilinea. */
export function ensureCaptureLavorazioniBulletLines(text: string): string {
  const lines = text.split(/\r?\n/);
  const bodies = lines
    .map((line) => line.replace(BULLET_PREFIX_RE, "").trim())
    .filter((line, index, all) => line.length > 0 || index < all.length - 1);
  const nonEmpty = bodies.filter(Boolean);
  if (nonEmpty.length <= 1) return nonEmpty[0] ?? "";
  return nonEmpty.map((body) => `- ${body}`).join("\n");
}

function polishCaptureLavorazioniLine(line: string): string {
  let body = line.replace(BULLET_PREFIX_RE, "").trim();
  if (!body) return "";
  for (const [pattern, replacement] of STANDALONE_LINE_ABBREVS) {
    if (pattern.test(body)) return replacement;
  }
  for (const [pattern, replacement] of INLINE_WORKSHOP_ABBREVS) {
    body = body.replace(pattern, replacement);
  }
  let result = formatCaptureMultilineText(body);
  return result.replace(/\bpto\b/gi, "PTO");
}

/** OCR + bozza scheda lavorazioni: polish multilinea, abbreviazioni, elenco puntato. */
export function formatCaptureLavorazioniText(value: string): string {
  const raw = unescapeCaptureLiteralNewlines(value).trim();
  if (!raw) return "";
  const lines = coalesceCaptureLavorazioniLines(
    raw.split(/\r?\n/).map(polishCaptureLavorazioniLine).filter(Boolean),
  );
  if (lines.length === 0) return "";
  return ensureCaptureLavorazioniBulletLines(lines.join("\n"));
}

export function normalizeCaptureLavorazioniTextDraft(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return formatCaptureLavorazioniText(trimmed);
}

export function insertCaptureLavorazioniBulletNewline(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { value: string; cursor: number } {
  const insert = "\n- ";
  const next = value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
  return { value: next, cursor: selectionStart + insert.length };
}

export function isCaptureLavorazioneFieldKey(fieldKey: string): boolean {
  return /^riga_\d+_lavorazione$/i.test(fieldKey.trim());
}
