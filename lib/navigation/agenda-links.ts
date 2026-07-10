export type AgendaViewMode = "day" | "week" | "month" | "gantt" | "insight";

export type AgendaIntelligencePanel = "heatmap" | "weeklyLoad" | "autoScheduler" | "insights";

export type AgendaHrefParams = {
  date?: string;
  view?: AgendaViewMode;
  event?: string;
  workOrder?: string;
  hourSlot?: number;
  panel?: AgendaIntelligencePanel;
};

export const AGENDA_BASE_PATH = "/agenda";

export function buildAgendaHref(params?: AgendaHrefParams): string {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.view) q.set("view", params.view);
  if (params?.event) q.set("event", params.event);
  if (params?.workOrder) q.set("workOrder", params.workOrder);
  if (params?.hourSlot != null) q.set("hourSlot", String(params.hourSlot));
  if (params?.panel) q.set("panel", params.panel);
  const qs = q.toString();
  return qs ? `${AGENDA_BASE_PATH}?${qs}` : AGENDA_BASE_PATH;
}

export function buildAgendaFromLavorazioneHref(lavorazioneId: string, date?: string): string {
  return buildAgendaHref({ workOrder: lavorazioneId, date, view: "week" });
}

export function parseAgendaSearchParams(searchParams: URLSearchParams): {
  date: string | null;
  view: AgendaViewMode;
  eventId: string | null;
  workOrderId: string | null;
  hourSlot: number | null;
  panel: AgendaIntelligencePanel | null;
  legacyInsightView: boolean;
} {
  const viewRaw = searchParams.get("view");
  const legacyInsightView = viewRaw === "insight";
  const view: AgendaViewMode =
    viewRaw === "week" || viewRaw === "month" || viewRaw === "gantt" || viewRaw === "insight" ? viewRaw : "day";
  const hourRaw = searchParams.get("hourSlot");
  const hourSlot = hourRaw != null && /^\d+$/.test(hourRaw) ? Number(hourRaw) : null;
  const panelRaw = searchParams.get("panel");
  const panel: AgendaIntelligencePanel | null =
    panelRaw === "heatmap" || panelRaw === "weeklyLoad" || panelRaw === "autoScheduler" || panelRaw === "insights"
      ? panelRaw
      : null;
  return {
    date: searchParams.get("date"),
    view,
    eventId: searchParams.get("event"),
    workOrderId: searchParams.get("workOrder"),
    hourSlot,
    panel: legacyInsightView && !panel ? "insights" : panel,
    legacyInsightView,
  };
}
