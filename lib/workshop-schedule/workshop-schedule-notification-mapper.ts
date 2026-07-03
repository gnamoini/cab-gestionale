import type { WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";
import { buildAgendaHref } from "@/lib/navigation/agenda-links";
import { localDateTimeLabel } from "@/lib/workshop-schedule/datetime";
import { PLANNING_STATUS_LABELS } from "@/lib/workshop-schedule/types";

export type WorkshopScheduleNotificationKind =
  | "workshop_schedule_created"
  | "workshop_schedule_updated"
  | "workshop_schedule_deleted"
  | "workshop_schedule_conflict"
  | "workshop_schedule_overdue"
  | "workshop_schedule_not_started"
  | "workshop_schedule_reminder_due"
  | "workshop_schedule_day_saturated"
  | "workshop_schedule_day_empty";

export function buildWorkshopScheduleNotification(input: {
  kind: WorkshopScheduleNotificationKind;
  session: Pick<WorkshopScheduleSessionView, "id" | "title" | "startAt" | "planningStatus">;
  detail?: string;
}): { type: WorkshopScheduleNotificationKind; title: string; body: string; href: string; dedupKey: string } {
  const when = localDateTimeLabel(input.session.startAt);
  const status = PLANNING_STATUS_LABELS[input.session.planningStatus];
  const href = buildAgendaHref({ event: input.session.id });
  const baseTitle = input.session.title.trim() || "Sessione agenda";
  const body = input.detail ?? `${when} · ${status}`;
  const dedupKey = `${input.kind}:${input.session.id}:${input.session.startAt.slice(0, 10)}`;
  const titles: Record<WorkshopScheduleNotificationKind, string> = {
    workshop_schedule_created: `Nuova sessione: ${baseTitle}`,
    workshop_schedule_updated: `Sessione aggiornata: ${baseTitle}`,
    workshop_schedule_deleted: `Sessione eliminata: ${baseTitle}`,
    workshop_schedule_conflict: `Conflitto agenda: ${baseTitle}`,
    workshop_schedule_overdue: `Sessione in ritardo: ${baseTitle}`,
    workshop_schedule_not_started: `Sessione non avviata: ${baseTitle}`,
    workshop_schedule_reminder_due: `Promemoria agenda: ${baseTitle}`,
    workshop_schedule_day_saturated: "Agenda satura oggi",
    workshop_schedule_day_empty: "Agenda vuota oggi",
  };
  return { type: input.kind, title: titles[input.kind], body, href, dedupKey };
}
