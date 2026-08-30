export type ReportPeriodPreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "current_week"
  | "last_week"
  | "current_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "current_quarter"
  | "last_quarter"
  | "last_12_months"
  | "ytd"
  | "previous_year"
  | "last_3_years"
  | "custom";
export type ReportCompareMode =
  | "none"
  | "prev_year"
  | "prev_period"
  | "avg_3_months"
  | "avg_12_months"
  | "avg_3_years"
  | "custom_range";

export type DateRange = { start: Date; end: Date };

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Giorno corrente in locale: da mezzanotte fino al momento indicato (incluso). */
export function todayUntilNowRange(anchor = new Date()): DateRange {
  return { start: startOfLocalDay(anchor), end: anchor };
}

function addLocalDays(d: Date, days: number): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + days,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  );
}

/** Lunedì 00:00 della settimana locale che contiene `d`. */
export function startOfLocalWeekMonday(d: Date): Date {
  const day = d.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return startOfLocalDay(addLocalDays(d, -daysSinceMonday));
}

export function parseYmdToLocalDate(ymd: string): Date | null {
  return parseYmd(ymd);
}

export function ymdFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthKeyFromYmd(ymd: string): string | null {
  const d = parseYmd(ymd);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Intervallo lun–dom (inclusivo) della settimana che contiene `ymd`. */
export function weekRangeFromYmd(ymd: string): DateRange | null {
  const d = parseYmd(ymd);
  if (!d) return null;
  const start = startOfLocalWeekMonday(d);
  const end = endOfLocalDay(addLocalDays(start, 6));
  return { start, end };
}

export function dayRangeFromYmd(ymd: string): DateRange | null {
  const d = parseYmd(ymd);
  if (!d) return null;
  return { start: startOfLocalDay(d), end: endOfLocalDay(d) };
}

/** Range calendario del mese `YYYY-MM`. */
export function monthRangeFromKey(monthKey: string): DateRange | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  if (mo < 0 || mo > 11) return null;
  const start = startOfLocalDay(new Date(y, mo, 1));
  const end = endOfLocalDay(new Date(y, mo + 1, 0));
  return { start, end };
}

/** Indice trimestre 0–3 per mese locale. */
function quarterIndex(month: number): number {
  return Math.floor(month / 3);
}

/** 1° giorno del trimestre solare che contiene `d`. */
function startOfLocalQuarter(d: Date): Date {
  const q = quarterIndex(d.getMonth());
  return startOfLocalDay(new Date(d.getFullYear(), q * 3, 1));
}

/** Ultimo istante del trimestre solare che contiene `d`. */
/** Trimestre solare completo immediatamente precedente ad `anchor`. */
function previousLocalQuarterRange(anchor: Date): DateRange {
  const curQStart = startOfLocalQuarter(anchor);
  const prevQEnd = endOfLocalDay(addLocalDays(curQStart, -1));
  return { start: startOfLocalQuarter(prevQEnd), end: prevQEnd };
}

function parseYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);
  const d = new Date(y, mo, da, 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Intervallo inclusivo [start,end] in orario locale. */
export function resolvePresetRange(
  anchor: Date,
  preset: ReportPeriodPreset,
  customFrom?: string,
  customTo?: string,
): DateRange {
  const end = endOfLocalDay(anchor);
  if (preset === "custom") {
    const sf = customFrom ? parseYmd(customFrom) : null;
    const st = customTo ? parseYmd(customTo) : null;
    const start = sf ? startOfLocalDay(sf) : startOfLocalDay(addLocalDays(end, -30));
    const end2 = st ? endOfLocalDay(st) : end;
    if (start.getTime() <= end2.getTime()) return { start, end: end2 };
    return { start: startOfLocalDay(end2), end: endOfLocalDay(start) };
  }
  if (preset === "today") {
    return { start: startOfLocalDay(end), end };
  }
  if (preset === "yesterday") {
    const y = startOfLocalDay(addLocalDays(end, -1));
    return { start: y, end: endOfLocalDay(y) };
  }
  if (preset === "last_7_days") {
    return { start: startOfLocalDay(addLocalDays(end, -6)), end };
  }
  if (preset === "last_30_days") {
    return { start: startOfLocalDay(addLocalDays(end, -29)), end };
  }
  if (preset === "current_week") {
    return { start: startOfLocalWeekMonday(end), end };
  }
  if (preset === "last_week") {
    const thisWeekStart = startOfLocalWeekMonday(end);
    const lastWeekEnd = endOfLocalDay(addLocalDays(thisWeekStart, -1));
    const lastWeekStart = startOfLocalWeekMonday(lastWeekEnd);
    return { start: lastWeekStart, end: lastWeekEnd };
  }
  if (preset === "current_month") {
    return { start: startOfLocalDay(new Date(end.getFullYear(), end.getMonth(), 1)), end };
  }
  if (preset === "last_month") {
    const y = end.getFullYear();
    const m = end.getMonth();
    const start = startOfLocalDay(new Date(y, m - 1, 1));
    const monthEnd = endOfLocalDay(new Date(y, m, 0));
    return { start, end: monthEnd };
  }
  if (preset === "last_3_months") {
    const start = startOfLocalDay(new Date(end.getFullYear(), end.getMonth() - 2, 1));
    return { start, end };
  }
  if (preset === "last_6_months") {
    const start = startOfLocalDay(new Date(end.getFullYear(), end.getMonth() - 5, 1));
    return { start, end };
  }
  if (preset === "current_quarter") {
    return { start: startOfLocalQuarter(end), end };
  }
  if (preset === "last_quarter") {
    return previousLocalQuarterRange(end);
  }
  if (preset === "last_12_months") {
    const start = startOfLocalDay(new Date(end.getFullYear(), end.getMonth() - 11, 1));
    return { start, end };
  }
  if (preset === "ytd") {
    return { start: startOfLocalDay(new Date(end.getFullYear(), 0, 1)), end };
  }
  if (preset === "previous_year") {
    const y = end.getFullYear() - 1;
    return {
      start: startOfLocalDay(new Date(y, 0, 1)),
      end: endOfLocalDay(new Date(y, 11, 31)),
    };
  }
  if (preset === "last_3_years") {
    const start = startOfLocalDay(new Date(end.getFullYear(), end.getMonth() - 35, 1));
    return { start, end };
  }
  return { start: startOfLocalDay(new Date(end.getFullYear(), end.getMonth(), 1)), end };
}

export function isReportCompareAverageMode(mode: ReportCompareMode): boolean {
  return mode === "avg_3_months" || mode === "avg_12_months" || mode === "avg_3_years";
}

/** Proietta un totale della finestra di riferimento sulla lunghezza del periodo corrente. */
export function scaleCompareBaseline(totalInWindow: number, window: DateRange, cur: DateRange): number {
  const wDays = inclusiveDayCount(window);
  const cDays = inclusiveDayCount(cur);
  if (wDays <= 0 || cDays <= 0) return 0;
  return Math.round(((totalInWindow * cDays) / wDays) * 100) / 100;
}

export function compareBaselineValue(
  rawInCompareRange: number,
  compareRange: DateRange,
  curRange: DateRange,
  mode: ReportCompareMode,
): number {
  if (mode === "none") return rawInCompareRange;
  if (isReportCompareAverageMode(mode)) {
    return scaleCompareBaseline(rawInCompareRange, compareRange, curRange);
  }
  return rawInCompareRange;
}

function referenceWindowBefore(cur: DateRange, months: number): DateRange {
  const endRef = endOfLocalDay(addLocalDays(startOfLocalDay(cur.start), -1));
  const startRef = startOfLocalDay(new Date(endRef.getFullYear(), endRef.getMonth() - (months - 1), 1));
  return { start: startRef, end: endRef };
}

export function compareRangeFor(cur: DateRange, mode: ReportCompareMode): DateRange | null {
  if (mode === "none" || mode === "custom_range") return null;
  if (mode === "avg_3_months") return referenceWindowBefore(cur, 3);
  if (mode === "avg_12_months") return referenceWindowBefore(cur, 12);
  if (mode === "avg_3_years") return referenceWindowBefore(cur, 36);
  const ms = cur.end.getTime() - cur.start.getTime();
  if (mode === "prev_period") {
    const endPrev = new Date(cur.start.getTime() - 1);
    const startPrev = new Date(endPrev.getTime() - ms);
    return { start: startOfLocalDay(startPrev), end: endOfLocalDay(endPrev) };
  }
  const start = addYearsKeepCalendar(cur.start, -1);
  const end = addYearsKeepCalendar(cur.end, -1);
  return { start: startOfLocalDay(start), end: endOfLocalDay(end) };
}

function parseCustomYmdRange(customFrom?: string, customTo?: string): DateRange | null {
  const sf = customFrom ? parseYmd(customFrom) : null;
  const st = customTo ? parseYmd(customTo) : null;
  if (!sf || !st) return null;
  const start = startOfLocalDay(sf);
  const end = endOfLocalDay(st);
  if (start.getTime() <= end.getTime()) return { start, end };
  return { start: startOfLocalDay(st), end: endOfLocalDay(sf) };
}

/** Intervallo confronto: preset derivato dal periodo analisi o range personalizzato. */
export function resolveReportCompareRange(
  cur: DateRange,
  mode: ReportCompareMode,
  customFrom?: string,
  customTo?: string,
): DateRange | null {
  if (mode === "none") return null;
  if (mode === "custom_range") return parseCustomYmdRange(customFrom, customTo);
  return compareRangeFor(cur, mode);
}

function addYearsKeepCalendar(d: Date, deltaYears: number): Date {
  return new Date(
    d.getFullYear() + deltaYears,
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  );
}

export function isoInRange(iso: string, r: DateRange): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= r.start.getTime() && t <= r.end.getTime();
}

export function deltaPct(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatCompareLabel(mode: ReportCompareMode, cur: DateRange, prev: DateRange | null): string {
  if (!prev || mode === "none") return "";
  const fmt = (d: Date) =>
    d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
  if (mode === "avg_3_months") {
    return `Confronto vs media ultimi 3 mesi (${fmt(prev.start)} — ${fmt(prev.end)})`;
  }
  if (mode === "avg_12_months") {
    return `Confronto vs media ultimo anno (${fmt(prev.start)} — ${fmt(prev.end)})`;
  }
  if (mode === "avg_3_years") {
    return `Confronto vs media ultimi 3 anni (${fmt(prev.start)} — ${fmt(prev.end)})`;
  }
  if (mode === "custom_range") {
    return `Confronto periodo personalizzato (${fmt(prev.start)} — ${fmt(prev.end)})`;
  }
  if (mode === "prev_year") {
    return `Confronto: ${fmt(cur.start)} — ${fmt(cur.end)} vs ${fmt(prev.start)} — ${fmt(prev.end)}`;
  }
  return `Confronto con periodo precedente (${fmt(prev.start)} — ${fmt(prev.end)})`;
}

/** Giorni inclusivi nel range (presentazione). */
export function inclusiveDayCount(range: DateRange): number {
  const start = startOfLocalDay(range.start).getTime();
  const end = startOfLocalDay(range.end).getTime();
  if (end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}
