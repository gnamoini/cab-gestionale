const WEEKDAYS_IT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"] as const;

const MONTHS_IT = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
] as const;

export function formatMonthTitle(year: number, monthIndex: number): string {
  return `${MONTHS_IT[monthIndex]} ${year}`;
}

export { WEEKDAYS_IT, MONTHS_IT };

export type CalendarCell = {
  date: Date;
  inMonth: boolean;
  ymd: string;
};

export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ymdToLocalDate(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  const d = new Date(y, mo - 1, day, 12, 0, 0, 0);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) return null;
  return d;
}

/** Griglia 6×7 (lun–dom) per il mese visualizzato. */
export function buildMonthGrid(viewYear: number, viewMonth: number): CalendarCell[] {
  const first = new Date(viewYear, viewMonth, 1, 12, 0, 0, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(viewYear, viewMonth, 1 - startOffset, 12, 0, 0, 0);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12, 0, 0, 0);
    cells.push({
      date,
      inMonth: date.getMonth() === viewMonth,
      ymd: toYmd(date),
    });
  }
  return cells;
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1, 12, 0, 0, 0);
  return { year: d.getFullYear(), month: d.getMonth() };
}
