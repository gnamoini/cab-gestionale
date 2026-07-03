/** Dominio planning — invarianti e regole business */
export const WORKSHOP_PLANNING_STATUSES = [
  "scheduled",
  "confirmed",
  "rescheduled",
  "cancelled",
  "completed",
] as const;

export type WorkshopPlanningStatus = (typeof WORKSHOP_PLANNING_STATUSES)[number];

/** event_type = presentation only; non usare per branching business critico */
export const WORKSHOP_EVENT_TYPES = [
  "intervento_programmato",
  "promemoria",
  "appuntamento",
  "blocco_agenda",
  "altro",
] as const;

export type WorkshopScheduleEventType = (typeof WORKSHOP_EVENT_TYPES)[number];

export const WORKSHOP_BLOCK_TYPES = [
  "ferie",
  "chiusura",
  "formazione",
  "riunione",
  "pausa",
  "altro",
] as const;

export type WorkshopBlockType = (typeof WORKSHOP_BLOCK_TYPES)[number];

export const WORKSHOP_PRIORITIES = ["alta", "media", "bassa"] as const;
export type WorkshopPriority = (typeof WORKSHOP_PRIORITIES)[number];

export type WorkshopScheduleSession = {
  id: string;
  title: string;
  description: string | null;
  eventType: WorkshopScheduleEventType;
  blockType: WorkshopBlockType | null;
  startAt: string;
  endAt: string;
  planningStatus: WorkshopPlanningStatus;
  priority: WorkshopPriority | null;
  workOrderId: string | null;
  revision: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  seriesId: string | null;
  recurrenceFrequency: string | null;
  recurrenceInterval: number | null;
  recurrenceUntil: string | null;
  legacyPromemoriaId: string | null;
};

/** DTO projection — unico tipo consumato da Agenda UI e pannello Lavorazioni */
export type WorkshopScheduleWorkOrderDisplay = {
  id: string;
  codice: string | null;
  cliente: string | null;
  targa: string | null;
  stato: string | null;
  meccanici: string | null;
};

export type WorkshopScheduleSessionView = WorkshopScheduleSession & {
  workOrder: WorkshopScheduleWorkOrderDisplay | null;
};

export type WorkshopScheduleFilters = {
  eventTypes?: WorkshopScheduleEventType[];
  priorities?: WorkshopPriority[];
  planningStatuses?: WorkshopPlanningStatus[];
  withWorkOrder?: boolean | null;
  createdBy?: string | null;
  workOrderId?: string | null;
};

export type WorkshopScheduleConflict = {
  eventId: string;
  conflictType: "same_wo" | "cross_wo" | "block";
  title: string;
  startAt: string;
  endAt: string;
  workOrderId: string | null;
};

export const PLANNING_STATUS_LABELS: Record<WorkshopPlanningStatus, string> = {
  scheduled: "Da pianificare",
  confirmed: "Pianificato",
  rescheduled: "Ripianificato",
  cancelled: "Annullato",
  completed: "Completato",
};

export const DND_PATCH_ALLOWED_FIELDS = ["start_at", "end_at", "planning_status", "revision", "updated_at"] as const;

export const DND_PATCH_FORBIDDEN_FIELDS = [
  "event_type",
  "work_order_id",
  "priority",
  "title",
  "description",
  "block_type",
  "created_by",
] as const;
