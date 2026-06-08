import { parseItalianDayToIso } from "@/lib/lavorazioni/date-day-only";

export type ItalianDateValidationStatus = "incomplete" | "valid" | "invalid";

export type ItalianDateValidation = {
  status: ItalianDateValidationStatus;
  message?: string;
};

export type ItalianDateYearRange = {
  min: number;
  max: number;
};

export const DEFAULT_ITALIAN_DATE_YEAR_RANGE: ItalianDateYearRange = {
  min: 1900,
  max: 2100,
};

const MSG_INVALID_DATE = "Data non valida";
const MSG_INVALID_FORMAT = "Formato data non valido";

const MAX_DAYS_WITHOUT_YEAR = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Espande anno a 2 cifre: 26 → 2026 (regola 2000+YY). */
export function expandTwoDigitYear(yy: number): number {
  return 2000 + yy;
}

/** Giorni nel mese; senza anno febbraio ammette fino a 29 (digitazione parziale). */
export function daysInMonth(month: number, year?: number): number {
  if (month < 1 || month > 12) return 0;
  if (year !== undefined) return new Date(year, month, 0).getDate();
  return MAX_DAYS_WITHOUT_YEAR[month - 1] ?? 31;
}

/** Verifica che il giorno esista nel mese (es. 31/06 → false). */
export function isDayValidForMonth(day: number, month: number, year?: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(month, year);
}

/** Estrae al massimo 8 cifre da testo digitato o incollato. */
export function extractItalianDateDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 8);
}

/** Formatta cifre progressive in gg/mm/aaaa con slash automatici. */
export function formatItalianDateDigits(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 8);
  if (!d) return "";
  if (d.length === 7) {
    const monthMiddle = parseInt(d.slice(1, 3), 10);
    if (monthMiddle >= 1 && monthMiddle <= 12) {
      return `${d[0]}/${d.slice(1, 3)}/${d.slice(3)}`;
    }
    const monthStandard = parseInt(d.slice(2, 4), 10);
    if (monthStandard >= 1 && monthStandard <= 12) {
      return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
    }
    return `${d.slice(0, 2)}/${d[2]}/${d.slice(3)}`;
  }
  if (d.length <= 2) return d.length === 2 ? `${d}/` : d;
  if (d.length <= 4) {
    const month = d.slice(2);
    return month.length === 2 ? `${d.slice(0, 2)}/${month}/` : `${d.slice(0, 2)}/${month}`;
  }
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Normalizza testo incollato (compatta, slash, trattino, punto) in display mascherato. */
export function normalizeItalianDatePaste(text: string): string {
  return formatItalianDateDigits(extractItalianDateDigits(text));
}

function countDigitsBeforeIndex(raw: string, index: number): number {
  let count = 0;
  const limit = Math.min(Math.max(0, index), raw.length);
  for (let i = 0; i < limit; i++) {
    if (/\d/.test(raw[i]!)) count++;
  }
  return count;
}

/** Posizione cursore nel display in base al numero di cifre prima del cursore. */
export function cursorFromDigitCount(digitCount: number): number {
  const n = Math.max(0, Math.min(8, digitCount));
  if (n === 0) return 0;
  if (n <= 2) return n === 2 ? 3 : n;
  if (n <= 4) return n === 4 ? 6 : n + 1;
  return n + 2;
}

export function applyItalianDateMaskChange(
  _prevDisplay: string,
  nextRaw: string,
  selectionStart: number,
): { display: string; cursor: number } {
  const rawDigits = nextRaw.replace(/\D/g, "");
  if (rawDigits.length > 8) {
    const digits = rawDigits.slice(0, 8);
    const display = formatItalianDateDigits(digits);
    return { display, cursor: display.length };
  }
  const digits = extractItalianDateDigits(nextRaw);
  const display = formatItalianDateDigits(digits);
  const digitsBefore = countDigitsBeforeIndex(nextRaw, selectionStart);
  const cursor = cursorFromDigitCount(digitsBefore);
  return { display, cursor: Math.min(cursor, display.length) };
}

function removeDigitsByIndex(digits: string, indicesToRemove: Set<number>): string {
  return [...digits].filter((_, i) => !indicesToRemove.has(i)).join("");
}

function removeDigitsInSelection(display: string, selStart: number, selEnd: number): string {
  const digits = extractItalianDateDigits(display);
  const toRemove = new Set<number>();
  let digitIdx = 0;
  for (let i = 0; i < display.length; i++) {
    const ch = display[i]!;
    if (!/\d/.test(ch)) continue;
    if (i >= selStart && i < selEnd) toRemove.add(digitIdx);
    digitIdx++;
  }
  return removeDigitsByIndex(digits, toRemove);
}

export type ItalianDateEditResult = { display: string; cursor: number };

/** Backspace: rimuove cifre, ignora slash nel display. */
export function applyItalianDateBackspace(
  display: string,
  selectionStart: number,
  selectionEnd: number,
): ItalianDateEditResult | null {
  const selStart = Math.max(0, selectionStart);
  const selEnd = Math.max(selStart, selectionEnd);

  let newDigits: string;
  let cursorDigitCount: number;

  if (selStart !== selEnd) {
    newDigits = removeDigitsInSelection(display, selStart, selEnd);
    if (newDigits === extractItalianDateDigits(display)) return null;
    cursorDigitCount = countDigitsBeforeIndex(display, selStart);
  } else {
    const digitsBefore = countDigitsBeforeIndex(display, selStart);
    if (digitsBefore === 0) return null;
    const digitIdx = digitsBefore - 1;
    const digits = extractItalianDateDigits(display);
    newDigits = digits.slice(0, digitIdx) + digits.slice(digitIdx + 1);
    cursorDigitCount = digitIdx;
  }

  const nextDisplay = formatItalianDateDigits(newDigits);
  const cursor = cursorFromDigitCount(cursorDigitCount);
  return { display: nextDisplay, cursor: Math.min(cursor, nextDisplay.length) };
}

/** Delete (in avanti): rimuove cifra dopo cursore, salta slash. */
export function applyItalianDateForwardDelete(
  display: string,
  selectionStart: number,
  selectionEnd: number,
): ItalianDateEditResult | null {
  const selStart = Math.max(0, selectionStart);
  const selEnd = Math.max(selStart, selectionEnd);

  if (selStart !== selEnd) {
    return applyItalianDateBackspace(display, selStart, selEnd);
  }

  const digits = extractItalianDateDigits(display);
  const digitsBefore = countDigitsBeforeIndex(display, selStart);
  if (digitsBefore >= digits.length) return null;

  const newDigits = digits.slice(0, digitsBefore) + digits.slice(digitsBefore + 1);
  const nextDisplay = formatItalianDateDigits(newDigits);
  const cursor = cursorFromDigitCount(digitsBefore);
  return { display: nextDisplay, cursor: Math.min(cursor, nextDisplay.length) };
}

function isDaySegmentInvalid(dayStr: string): boolean {
  if (dayStr.length < 2) return false;
  const day = parseInt(dayStr, 10);
  return day < 1 || day > 31;
}

function isMonthSegmentInvalid(monthStr: string): boolean {
  if (monthStr.length < 2) return false;
  const month = parseInt(monthStr, 10);
  return month < 1 || month > 12;
}

function isYearOutOfRange(year: number, range: ItalianDateYearRange): boolean {
  return year < range.min || year > range.max;
}

function formatCanonicalDisplay(day: number, month: number, year: number): string {
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  return `${dd}/${mm}/${year}`;
}

/**
 * Normalizza display mascherato in gg/mm/aaaa canonico.
 * Supporta anno a 2 cifre (26 → 2026). Ritorna null se incompleto o invalido.
 */
export function canonicalizeItalianDateDisplay(display: string): string | null {
  const trimmed = display.trim();
  if (!trimmed) return null;

  const digits = extractItalianDateDigits(trimmed);
  if (digits.length === 4 || digits.length === 5 || digits.length === 7) return null;

  if (digits.length === 6) {
    const day = parseInt(digits.slice(0, 2), 10);
    const month = parseInt(digits.slice(2, 4), 10);
    const yy = parseInt(digits.slice(4, 6), 10);
    const year = expandTwoDigitYear(yy);
    if (!isDayValidForMonth(day, month, year)) return null;
    const formatted = formatCanonicalDisplay(day, month, year);
    const parsed = parseItalianDayToIso(formatted);
    if (!parsed.ok) return null;
    return formatted;
  }

  if (digits.length === 8) {
    const formatted = formatItalianDateDigits(digits);
    const parsed = parseItalianDayToIso(formatted);
    if (!parsed.ok) return null;
    return formatted;
  }

  return null;
}

/** Parse display (anche anno a 2 cifre) → ISO, senza modificare parseItalianDayToIso. */
export function parseItalianDayDisplayToIso(
  display: string,
): { ok: true; iso: string } | { ok: false } {
  const trimmed = display.trim();
  if (!trimmed) return { ok: false };
  const canonical = canonicalizeItalianDateDisplay(trimmed);
  if (canonical) return parseItalianDayToIso(canonical);
  return parseItalianDayToIso(trimmed);
}

export function parseOptionalItalianDayDisplayToIso(
  value: string,
): { ok: true; iso: string | null } | { ok: false } {
  const s = value.trim();
  if (!s) return { ok: true, iso: null };
  const r = parseItalianDayDisplayToIso(s);
  if (!r.ok) return { ok: false };
  return { ok: true, iso: r.iso };
}

/**
 * Validazione UX in tempo reale. Non sostituisce parseItalianDayToIso al commit.
 */
export function validateItalianDateInput(
  display: string,
  opts?: { yearRange?: ItalianDateYearRange },
): ItalianDateValidation {
  const trimmed = display.trim();
  if (!trimmed) return { status: "incomplete" };

  const digits = extractItalianDateDigits(trimmed);
  const yearRange = opts?.yearRange ?? DEFAULT_ITALIAN_DATE_YEAR_RANGE;

  if (digits.length > 8) {
    return { status: "invalid", message: MSG_INVALID_FORMAT };
  }

  const dayStr = digits.slice(0, 2);
  const monthStr = digits.slice(2, 4);
  const yearStr = digits.slice(4, 8);

  if (isDaySegmentInvalid(dayStr)) {
    return { status: "invalid", message: MSG_INVALID_DATE };
  }

  if (digits.length >= 3 && isMonthSegmentInvalid(monthStr)) {
    return { status: "invalid", message: MSG_INVALID_DATE };
  }

  if (digits.length >= 4 && monthStr.length === 2) {
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    if (!isDayValidForMonth(day, month)) {
      return { status: "invalid", message: MSG_INVALID_DATE };
    }
  }

  if (digits.length === 6) {
    const canonical = canonicalizeItalianDateDisplay(trimmed);
    if (!canonical) {
      return { status: "invalid", message: MSG_INVALID_DATE };
    }
    const year = expandTwoDigitYear(parseInt(digits.slice(4, 6), 10));
    if (isYearOutOfRange(year, yearRange)) {
      return { status: "invalid", message: MSG_INVALID_DATE };
    }
    return { status: "valid" };
  }

  if (digits.length === 7) {
    return { status: "incomplete" };
  }

  if (digits.length === 8) {
    const formatted = formatItalianDateDigits(digits);
    if (formatted.length !== 10) {
      return { status: "invalid", message: MSG_INVALID_FORMAT };
    }
    const parsed = parseItalianDayToIso(formatted);
    if (!parsed.ok) {
      return { status: "invalid", message: MSG_INVALID_DATE };
    }
    const year = parseInt(yearStr, 10);
    if (isYearOutOfRange(year, yearRange)) {
      return { status: "invalid", message: MSG_INVALID_DATE };
    }
    return { status: "valid" };
  }

  return { status: "incomplete" };
}
