import type { AgendaIntelligencePanel, AgendaViewMode } from "@/lib/navigation/agenda-links";
import { AGENDA_BASE_PATH, buildAgendaHref } from "@/lib/navigation/agenda-links";

export type AgendaUrlSnapshot = {
  date: string | null;
  view: AgendaViewMode;
  eventId: string | null;
  workOrderId: string | null;
  hourSlot: number | null;
  panel: AgendaIntelligencePanel | null;
};

/** Legacy `?view=insight` → canonical URL con panel insights. */
export function resolveAgendaInsightLegacyHref(searchParams: URLSearchParams): string | null {
  if (searchParams.get("view") !== "insight") return null;
  const q = new URLSearchParams(searchParams);
  q.delete("view");
  if (!q.get("panel")) q.set("panel", "insights");
  const qs = q.toString();
  return qs ? `${AGENDA_BASE_PATH}?${qs}` : `${AGENDA_BASE_PATH}?panel=insights`;
}

export function buildAgendaHrefFromSnapshot(snapshot: AgendaUrlSnapshot): string {
  return buildAgendaHref({
    date: snapshot.date ?? undefined,
    view: snapshot.view === "insight" ? undefined : snapshot.view,
    event: snapshot.eventId ?? undefined,
    workOrder: snapshot.workOrderId ?? undefined,
    hourSlot: snapshot.hourSlot ?? undefined,
    panel: snapshot.panel ?? undefined,
  });
}

export function agendaUrlSnapshotKey(snapshot: AgendaUrlSnapshot): string {
  return buildAgendaHrefFromSnapshot(snapshot);
}
