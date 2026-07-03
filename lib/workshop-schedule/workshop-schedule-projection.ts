import type { WorkshopScheduleSession, WorkshopScheduleSessionView, WorkshopScheduleWorkOrderDisplay } from "@/lib/workshop-schedule/types";
import { mapDbRowToSession, type WorkshopScheduleDbRow } from "@/lib/workshop-schedule/workshop-schedule-db-mapper";

export type LavorazioneProjectionRow = {
  id: string;
  codice?: string | null;
  cliente?: string | null;
  stato?: string | null;
  mezzo?: { targa?: string | null; marca?: string | null; modello?: string | null } | null;
  addetto?: string | null;
};

function mapWorkOrderDisplay(row: LavorazioneProjectionRow | null | undefined): WorkshopScheduleWorkOrderDisplay | null {
  if (!row) return null;
  const targa = row.mezzo?.targa?.trim() || null;
  return {
    id: row.id,
    codice: row.codice?.trim() || null,
    cliente: row.cliente?.trim() || null,
    targa,
    stato: row.stato?.trim() || null,
    meccanici: row.addetto?.trim() || null,
  };
}

export function enrichSessionView(
  session: WorkshopScheduleSession,
  workOrder?: LavorazioneProjectionRow | null,
): WorkshopScheduleSessionView {
  return {
    ...session,
    workOrder: session.workOrderId ? mapWorkOrderDisplay(workOrder) : null,
  };
}

export function enrichedViewFromRows(
  eventRows: readonly WorkshopScheduleDbRow[],
  workOrdersById: ReadonlyMap<string, LavorazioneProjectionRow>,
): WorkshopScheduleSessionView[] {
  return eventRows.map((row) => {
    const session = mapDbRowToSession(row);
    const wo = session.workOrderId ? workOrdersById.get(session.workOrderId) : undefined;
    return enrichSessionView(session, wo);
  });
}

export function sortSessionsByStart(sessions: readonly WorkshopScheduleSessionView[]): WorkshopScheduleSessionView[] {
  return [...sessions].sort((a, b) => a.startAt.localeCompare(b.startAt) || a.title.localeCompare(b.title));
}
