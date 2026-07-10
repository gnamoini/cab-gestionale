import { startOfLocalWeekMonday } from "@/lib/report/date-ranges";

export const OPERATIONAL_DIARY_BODY_MAX = 2000;
/** Placeholder riga diario (contesto qualitativo: assenze, guasti, imprevisti). */
export const OPERATIONAL_DIARY_PLACEHOLDER = "Assenze, guasti, imprevisti…";

export type OperationalDiaryWeekDay = {
  ymd: string;
  date: Date;
  weekdayLabel: string;
  dayMonthLabel: string;
};

function addLocalDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, 12, 0, 0, 0);
}

export function ymdFromLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseYmdLocal(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day, 12, 0, 0, 0);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return null;
  return d;
}

/** Settimana locale lun–dom (7 giorni) ancorata al lunedì di `anchor`. */
export function operationalDiaryWeekDays(anchor = new Date(), weekOffset = 0): OperationalDiaryWeekDay[] {
  const monday = addLocalDays(startOfLocalWeekMonday(anchor), weekOffset * 7);
  const fmtWeekday = new Intl.DateTimeFormat("it-IT", { weekday: "short" });
  const fmtDayMonth = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });
  const out: OperationalDiaryWeekDay[] = [];
  for (let i = 0; i < 7; i += 1) {
    const date = addLocalDays(monday, i);
    out.push({
      ymd: ymdFromLocalDate(date),
      date,
      weekdayLabel: fmtWeekday.format(date).replace(/\.$/, ""),
      dayMonthLabel: fmtDayMonth.format(date),
    });
  }
  return out;
}

export function operationalDiaryWeekLabel(anchor = new Date(), weekOffset = 0): string {
  const days = operationalDiaryWeekDays(anchor, weekOffset);
  const first = days[0]?.date;
  const last = days[6]?.date;
  if (!first || !last) return "";
  const fmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt.format(first)} – ${fmt.format(last)}`;
}

/** Offset settimana (lun–dom) rispetto alla settimana di `anchor` che contiene `ymd`. */
export function operationalDiaryWeekOffsetForYmd(anchor: Date, ymd: string): number | null {
  const d = parseYmdLocal(ymd);
  if (!d) return null;
  const anchorMon = startOfLocalWeekMonday(anchor);
  const targetMon = startOfLocalWeekMonday(d);
  const anchorMs = Date.UTC(anchorMon.getFullYear(), anchorMon.getMonth(), anchorMon.getDate());
  const targetMs = Date.UTC(targetMon.getFullYear(), targetMon.getMonth(), targetMon.getDate());
  const dayDiff = Math.round((targetMs - anchorMs) / 86_400_000);
  return Math.trunc(dayDiff / 7);
}
