import type { WorkshopScheduleEventType, WorkshopPlanningStatus } from "@/lib/workshop-schedule/types";

export const MAX_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export type TemporalValidationResult = { ok: true } | { ok: false; code: string; message: string };

export function validateTemporalRange(startAt: string, endAt: string): TemporalValidationResult {
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { ok: false, code: "ERR_INVALID_TIME", message: "Orario non valido." };
  }
  if (start >= end) {
    return { ok: false, code: "ERR_TIME_ORDER", message: "L'orario di fine deve essere successivo all'inizio." };
  }
  if (end - start > MAX_SESSION_DURATION_MS) {
    return { ok: false, code: "ERR_MAX_DURATION", message: "Durata massima sessione: 24 ore." };
  }
  return { ok: true };
}

export function validateBloccoAgendaShape(input: {
  eventType: WorkshopScheduleEventType;
  blockType: string | null;
  workOrderId: string | null;
  planningStatus: WorkshopPlanningStatus;
}): TemporalValidationResult {
  if (input.eventType !== "blocco_agenda") return { ok: true };
  if (input.workOrderId != null) {
    return { ok: false, code: "ERR_BLOCK_WO", message: "I blocchi agenda non possono essere collegati a lavorazioni." };
  }
  if (!input.blockType?.trim()) {
    return { ok: false, code: "ERR_BLOCK_TYPE", message: "Tipo blocco obbligatorio." };
  }
  if (input.planningStatus !== "confirmed") {
    return { ok: false, code: "ERR_BLOCK_STATUS", message: "I blocchi agenda devono essere confermati." };
  }
  return { ok: true };
}

export function assertTemporalRange(startAt: string, endAt: string): void {
  const r = validateTemporalRange(startAt, endAt);
  if (!r.ok) throw new Error(r.message);
}
