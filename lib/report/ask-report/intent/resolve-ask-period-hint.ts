import { ymdFromDate } from "@/lib/report/date-ranges";
import { normalizeAskMessage } from "@/lib/report/ask-report/intent/normalize-ask-message";
import { messageWantsComparison } from "@/lib/report/ask-report/intent/resolve-compare-from-message";

const IT_MONTHS: Readonly<Record<string, number>> = {
  gennaio: 0,
  febbraio: 1,
  marzo: 2,
  aprile: 3,
  maggio: 4,
  giugno: 5,
  luglio: 6,
  agosto: 7,
  settembre: 8,
  ottobre: 9,
  novembre: 10,
  dicembre: 11,
};

export type AskPeriodHint = {
  start: string;
  end: string;
  label: string;
};

function capitalizeMonth(name: string): string {
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

function monthRange(year: number, monthIndex: number): AskPeriodHint {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  const name = Object.entries(IT_MONTHS).find(([, idx]) => idx === monthIndex)?.[0] ?? "";
  return {
    start: ymdFromDate(start),
    end: ymdFromDate(end),
    label: `${capitalizeMonth(name)} ${year}`,
  };
}

function quarterRange(year: number, quarter: 1 | 2 | 3 | 4): AskPeriodHint {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return {
    start: ymdFromDate(start),
    end: ymdFromDate(end),
    label: `T${quarter} ${year}`,
  };
}

/** Giorni di calendario nel range (inclusivi). */
export function calendarDaysInYmdRange(start: string, end: string): number {
  const startMs = new Date(`${start}T12:00:00`).getTime();
  const endMs = new Date(`${end}T12:00:00`).getTime();
  return Math.max(1, Math.round((endMs - startMs) / 86_400_000) + 1);
}

/** Etichetta leggibile da range YMD (es. Luglio 2026, Luglio–Agosto 2026). */
export function formatAskPeriodLabel(period: { start: string; end: string }): string {
  const start = new Date(`${period.start}T12:00:00`);
  const end = new Date(`${period.end}T12:00:00`);
  const monthName = (d: Date) => {
    const key = Object.entries(IT_MONTHS).find(([, idx]) => idx === d.getMonth())?.[0];
    return key ? capitalizeMonth(key) : "";
  };
  const sy = start.getFullYear();
  const ey = end.getFullYear();
  if (start.getMonth() === end.getMonth() && sy === ey) {
    return `${monthName(start)} ${sy}`;
  }
  if (sy === ey) {
    return `${monthName(start)}–${monthName(end)} ${sy}`;
  }
  return `${period.start} – ${period.end}`;
}

/** Giorni di calendario nel range → settimane (media settimanale Ask Report). */
export function calendarWeeksInYmdRange(start: string, end: string): number {
  return calendarDaysInYmdRange(start, end) / 7;
}

/** True se la domanda cita almeno un mese italiano (es. "ad agosto"). */
export function messageMentionsItalianMonth(message: string): boolean {
  const text = normalizeAskMessage(message);
  return Object.keys(IT_MONTHS).some((name) => new RegExp(`\\b${name}\\b`).test(text));
}

function resolveRelativePeriodHint(text: string, anchor: Date): AskPeriodHint | null {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  if (/\banno\s+scorso\b/.test(text) && !messageMentionsItalianMonth(text)) {
    const y = year - 1;
    return {
      start: `${y}-01-01`,
      end: `${y}-12-31`,
      label: `Anno ${y}`,
    };
  }

  if (/\bquesto\s+mese\b|\bmese\s+corrente\b/.test(text)) {
    return monthRange(year, month);
  }

  if (/\bmese\s+scorso\b|\bultimo\s+mese\b/.test(text)) {
    const d = new Date(year, month - 1, 1);
    return monthRange(d.getFullYear(), d.getMonth());
  }

  if (/\bquesta\s+settimana\b/.test(text)) {
    const day = anchor.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(anchor);
    start.setDate(anchor.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start: ymdFromDate(start),
      end: ymdFromDate(end),
      label: "Questa settimana",
    };
  }

  if (/\bsettimana\s+scorsa\b|\bultima\s+settimana\b/.test(text)) {
    const day = anchor.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const end = new Date(anchor);
    end.setDate(anchor.getDate() + mondayOffset - 1);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return {
      start: ymdFromDate(start),
      end: ymdFromDate(end),
      label: "Settimana scorsa",
    };
  }

  const qMatch = text.match(/\b(?:t|trimestre)\s*([1-4])\b|\bq([1-4])\b/);
  if (qMatch) {
    const q = Number(qMatch[1] ?? qMatch[2]) as 1 | 2 | 3 | 4;
    const explicitYear = text.match(/\b(20\d{2})\b/);
    return quarterRange(explicitYear ? Number(explicitYear[1]) : year, q);
  }

  if (/\bultimo\s+trimestre\b|\btrimestre\s+scorso\b/.test(text)) {
    const d = new Date(year, month - 3, 1);
    const q = (Math.floor(d.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
    return quarterRange(d.getFullYear(), q);
  }

  return null;
}

function resolveItalianMonthHint(text: string, anchorYear: number): AskPeriodHint | null {
  const yearMatch = text.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : anchorYear;

  const matched: Array<{ name: string; index: number }> = [];
  for (const [name, monthIndex] of Object.entries(IT_MONTHS)) {
    if (new RegExp(`\\b${name}\\b`).test(text)) {
      matched.push({ name, index: monthIndex });
    }
  }
  if (!matched.length) return null;

  matched.sort((a, b) => a.index - b.index);
  const first = matched[0]!;
  const last = matched[matched.length - 1]!;
  const start = new Date(year, first.index, 1);
  const end = new Date(year, last.index + 1, 0);

  const label =
    matched.length === 1
      ? `${capitalizeMonth(first.name)} ${year}`
      : `${capitalizeMonth(first.name)}–${capitalizeMonth(last.name)} ${year}`;

  return {
    start: ymdFromDate(start),
    end: ymdFromDate(end),
    label,
  };
}

/** Estrae periodo da mesi italiani o espressioni relative (mese scorso, trimestre, …). */
export function resolvePeriodHintFromMessage(
  message: string,
  anchorYear = new Date().getFullYear(),
  anchorDate?: Date,
): AskPeriodHint | null {
  const text = normalizeAskMessage(message);
  const anchor = anchorDate ?? new Date(`${anchorYear}-06-15T12:00:00`);

  // ponytail: confronto esplicito → compareMode, non shift periodo su mese/anno scorso
  if (messageWantsComparison(message)) {
    if (/\banno\s+scorso\b/.test(text) && !messageMentionsItalianMonth(message)) return null;
    if (/\bmese\s+scorso\b|\bultimo\s+mese\b|\bsettimana\s+scorsa\b/.test(text)) return null;
  }

  return (
    resolveItalianMonthHint(text, anchor.getFullYear()) ??
    resolveRelativePeriodHint(text, anchor)
  );
}
