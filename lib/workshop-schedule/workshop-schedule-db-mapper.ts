import type {
  WorkshopBlockType,
  WorkshopPlanningStatus,
  WorkshopPriority,
  WorkshopScheduleEventType,
  WorkshopScheduleSession,
} from "@/lib/workshop-schedule/types";

export type WorkshopScheduleDbRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  block_type: string | null;
  start_at: string;
  end_at: string;
  planning_status: string;
  priority: string | null;
  work_order_id: string | null;
  revision: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  series_id: string | null;
  recurrence_frequency: string | null;
  recurrence_interval: number | null;
  recurrence_until: string | null;
  legacy_promemoria_id: string | null;
};

function asEventType(v: string): WorkshopScheduleEventType {
  const allowed: WorkshopScheduleEventType[] = [
    "intervento_programmato",
    "promemoria",
    "appuntamento",
    "blocco_agenda",
    "altro",
  ];
  return (allowed.includes(v as WorkshopScheduleEventType) ? v : "altro") as WorkshopScheduleEventType;
}

function asPlanningStatus(v: string): WorkshopPlanningStatus {
  const allowed: WorkshopPlanningStatus[] = ["scheduled", "confirmed", "rescheduled", "cancelled", "completed"];
  return (allowed.includes(v as WorkshopPlanningStatus) ? v : "scheduled") as WorkshopPlanningStatus;
}

function asPriority(v: string | null): WorkshopPriority | null {
  if (!v) return null;
  return v === "alta" || v === "media" || v === "bassa" ? v : null;
}

function asBlockType(v: string | null): WorkshopBlockType | null {
  if (!v) return null;
  const allowed: WorkshopBlockType[] = ["ferie", "chiusura", "formazione", "riunione", "pausa", "altro"];
  return allowed.includes(v as WorkshopBlockType) ? (v as WorkshopBlockType) : "altro";
}

export function mapDbRowToSession(row: WorkshopScheduleDbRow): WorkshopScheduleSession {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    eventType: asEventType(row.event_type),
    blockType: asBlockType(row.block_type),
    startAt: row.start_at,
    endAt: row.end_at,
    planningStatus: asPlanningStatus(row.planning_status),
    priority: asPriority(row.priority),
    workOrderId: row.work_order_id,
    revision: row.revision,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    seriesId: row.series_id,
    recurrenceFrequency: row.recurrence_frequency,
    recurrenceInterval: row.recurrence_interval,
    recurrenceUntil: row.recurrence_until,
    legacyPromemoriaId: row.legacy_promemoria_id,
  };
}

export function mapSessionToDbPatch(session: Partial<WorkshopScheduleSession>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (session.title !== undefined) out.title = session.title;
  if (session.description !== undefined) out.description = session.description;
  if (session.eventType !== undefined) out.event_type = session.eventType;
  if (session.blockType !== undefined) out.block_type = session.blockType;
  if (session.startAt !== undefined) out.start_at = session.startAt;
  if (session.endAt !== undefined) out.end_at = session.endAt;
  if (session.planningStatus !== undefined) out.planning_status = session.planningStatus;
  if (session.priority !== undefined) out.priority = session.priority;
  if (session.workOrderId !== undefined) out.work_order_id = session.workOrderId;
  if (session.revision !== undefined) out.revision = session.revision;
  return out;
}
