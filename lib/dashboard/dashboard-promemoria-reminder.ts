import { todayDateYmd } from "@/lib/dipendenti/timesheet-month";
import type { DashboardPromemoriaReminderNotification } from "@/lib/notifications/admin-dashboard-notifications";
import type { DashboardPromemoriaRow } from "@/lib/dashboard/dashboard-promemoria-types";

export const DASHBOARD_PROMEMORIA_REMINDER_HOUR = 9;
export const DASHBOARD_PROMEMORIA_REMINDER_MINUTE = 0;
export const DASHBOARD_PROMEMORIA_TIMED_REMINDER_LEAD_MINUTES = 30;

/** Parsing `HH:MM` o `HH:MM:SS`. */
export function parsePromemoriaEventTimeHm(raw: string | null | undefined): { hour: number; minute: number } | null {
  if (!raw?.trim()) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(raw.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** Normalizza verso `HH:MM:SS` per Postgres `time`. */
export function normalizePromemoriaEventTime(raw: string | null | undefined): string | null {
  const hm = parsePromemoriaEventTimeHm(raw);
  if (!hm) return null;
  return `${String(hm.hour).padStart(2, "0")}:${String(hm.minute).padStart(2, "0")}:00`;
}

/** Etichetta breve per UI (`14:30`). */
export function formatPromemoriaEventTimeDisplay(raw: string | null | undefined): string | null {
  const hm = parsePromemoriaEventTimeHm(raw);
  if (!hm) return null;
  return `${String(hm.hour).padStart(2, "0")}:${String(hm.minute).padStart(2, "0")}`;
}

/** Valore per `<input type="time">`. */
export function promemoriaEventTimeInputValue(raw: string | null | undefined): string {
  return formatPromemoriaEventTimeDisplay(raw) ?? "";
}

export function isAtOrAfterPromemoriaReminderTime(
  date: Date,
  hour = DASHBOARD_PROMEMORIA_REMINDER_HOUR,
  minute = DASHBOARD_PROMEMORIA_REMINDER_MINUTE,
): boolean {
  if (date.getHours() > hour) return true;
  if (date.getHours() < hour) return false;
  return date.getMinutes() >= minute;
}

/** @deprecated Usare shouldNotifyPromemoriaNow per eventi singoli. */
export function shouldRunDashboardPromemoriaReminderCheck(now: Date = new Date()): boolean {
  return isAtOrAfterPromemoriaReminderTime(now);
}

export function dashboardPromemoriaReminderStoreKey(promemoriaId: string, eventDateYmd: string): string {
  return `promemoria:${promemoriaId}:${eventDateYmd}`;
}

export function formatDashboardPromemoriaReminderMessage(
  title: string,
  eventTime?: string | null,
): string {
  const t = title.trim() || "Evento";
  const timeLabel = formatPromemoriaEventTimeDisplay(eventTime);
  if (timeLabel) return `Promemoria: ${t} previsto per oggi alle ${timeLabel}.`;
  return `Promemoria: ${t} previsto per oggi.`;
}

export function formatDashboardPromemoriaReminderDesktopBody(
  title: string,
  description?: string | null,
  eventTime?: string | null,
): string {
  const base = formatDashboardPromemoriaReminderMessage(title, eventTime);
  const desc = description?.trim();
  if (!desc) return base;
  const short = desc.length > 120 ? `${desc.slice(0, 117)}…` : desc;
  return `${base} ${short}`;
}

export function buildDashboardPromemoriaReminderNotification(
  row: Pick<DashboardPromemoriaRow, "id" | "event_date" | "event_time" | "title" | "description">,
): DashboardPromemoriaReminderNotification {
  const title = row.title.trim();
  return {
    kind: "dashboard_promemoria_reminder",
    id: dashboardPromemoriaReminderStoreKey(row.id, row.event_date),
    promemoriaId: row.id,
    eventDateYmd: row.event_date,
    eventTime: row.event_time ?? null,
    title,
    message: formatDashboardPromemoriaReminderMessage(title, row.event_time),
    description: row.description ?? null,
    createdAt: new Date().toISOString(),
  };
}

function localDateYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function ymdToLocalDate(ymd: string): { year: number; month: number; day: number } {
  const [y, m, d] = ymd.split("-").map(Number);
  return { year: y, month: m, day: d };
}

/** Istante locale in cui inviare la notifica per l'evento. */
export function computePromemoriaReminderMoment(
  eventDateYmd: string,
  eventTime: string | null | undefined,
): Date {
  const { year, month, day } = ymdToLocalDate(eventDateYmd);
  const hm = parsePromemoriaEventTimeHm(eventTime ?? null);
  if (!hm) {
    return new Date(year, month - 1, day, DASHBOARD_PROMEMORIA_REMINDER_HOUR, DASHBOARD_PROMEMORIA_REMINDER_MINUTE, 0, 0);
  }
  const eventAt = new Date(year, month - 1, day, hm.hour, hm.minute, 0, 0);
  return new Date(eventAt.getTime() - DASHBOARD_PROMEMORIA_TIMED_REMINDER_LEAD_MINUTES * 60_000);
}

export function promemoriaNeedsReminderToday(
  row: Pick<DashboardPromemoriaRow, "event_date" | "notified_on">,
  todayYmd: string = todayDateYmd(),
): boolean {
  return row.event_date === todayYmd && row.notified_on !== todayYmd;
}

/** True se l'evento di oggi non è ancora stato notificato ed è passato l'orario di promemoria. */
export function shouldNotifyPromemoriaNow(
  row: Pick<DashboardPromemoriaRow, "event_date" | "event_time" | "notified_on">,
  now: Date = new Date(),
): boolean {
  const todayYmd = localDateYmd(now);
  if (row.event_date !== todayYmd) return false;
  if (row.notified_on === todayYmd) return false;
  const reminderAt = computePromemoriaReminderMoment(row.event_date, row.event_time);
  return now.getTime() >= reminderAt.getTime();
}

export const DASHBOARD_PROMEMORIA_REMINDER_TOAST =
  "Hai promemoria in calendario per oggi. Apri la Dashboard per i dettagli.";

export const DASHBOARD_PROMEMORIA_REMINDER_DESKTOP_TITLE = "Promemoria di oggi";
