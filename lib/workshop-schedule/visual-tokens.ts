import type {
  WorkshopPlanningStatus,
  WorkshopPriority,
  WorkshopScheduleEventType,
} from "@/lib/workshop-schedule/types";

export type SessionVisualTokens = {
  bgClass: string;
  borderClass: string;
  statusIcon: string;
  statusLabel: string;
};

const EVENT_BG: Record<WorkshopScheduleEventType, string> = {
  intervento_programmato: "bg-blue-100 dark:bg-blue-950/50",
  promemoria: "bg-amber-100 dark:bg-amber-950/40",
  appuntamento: "bg-violet-100 dark:bg-violet-950/40",
  blocco_agenda: "bg-zinc-200 dark:bg-zinc-700/60",
  altro: "bg-slate-100 dark:bg-slate-900/50",
};

const PRIORITY_BORDER: Record<WorkshopPriority, string> = {
  alta: "border-l-4 border-l-red-500",
  media: "border border-[color:var(--cab-border)]",
  bassa: "border border-dashed border-zinc-400 dark:border-zinc-500",
};

const STATUS_ICON: Record<WorkshopPlanningStatus, string> = {
  scheduled: "○",
  confirmed: "✓",
  rescheduled: "↻",
  cancelled: "✕",
  completed: "●",
};

export function resolveSessionVisualTokens(input: {
  eventType: WorkshopScheduleEventType;
  priority: WorkshopPriority | null;
  planningStatus: WorkshopPlanningStatus;
}): SessionVisualTokens {
  const priority = input.priority ?? "media";
  return {
    bgClass: EVENT_BG[input.eventType],
    borderClass: PRIORITY_BORDER[priority],
    statusIcon: STATUS_ICON[input.planningStatus],
    statusLabel: input.planningStatus,
  };
}
