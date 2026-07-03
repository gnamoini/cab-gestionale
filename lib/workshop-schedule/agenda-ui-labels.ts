import type {
  WorkshopBlockType,
  WorkshopPlanningStatus,
  WorkshopPriority,
  WorkshopScheduleEventType,
} from "@/lib/workshop-schedule/types";
import type { PlannerInsight } from "@/lib/workshop-schedule/intelligence/insights/types";
import {
  dsBadgeDanger,
  dsBadgeInfo,
  dsBadgeNeutral,
  dsBadgeOk,
  dsBadgeWarn,
} from "@/lib/ui/design-system";

export const EVENT_TYPE_LABELS: Record<WorkshopScheduleEventType, string> = {
  intervento_programmato: "Intervento",
  promemoria: "Promemoria",
  appuntamento: "Appuntamento",
  blocco_agenda: "Blocco agenda",
  altro: "Altro",
};

export const PRIORITY_LABELS: Record<WorkshopPriority, string> = {
  alta: "Alta",
  media: "Media",
  bassa: "Bassa",
};

export const BLOCK_TYPE_LABELS: Record<WorkshopBlockType, string> = {
  ferie: "Ferie",
  chiusura: "Chiusura",
  formazione: "Formazione",
  riunione: "Riunione",
  pausa: "Pausa",
  altro: "Altro",
};

export const INSIGHT_TYPE_LABELS: Record<PlannerInsight["type"], string> = {
  inefficiency: "Inefficienza",
  overload: "Sovraccarico",
  gap: "Tempo libero",
  optimization: "Ottimizzazione",
};

export const INSIGHT_SEVERITY_LABELS: Record<PlannerInsight["severity"], string> = {
  low: "Bassa",
  medium: "Media",
  high: "Alta",
};

export const INSIGHT_SEVERITY_BADGE_CLASS: Record<PlannerInsight["severity"], string> = {
  low: dsBadgeNeutral,
  medium: dsBadgeWarn,
  high: dsBadgeDanger,
};

export const PLANNING_STATUS_BADGE_CLASS: Record<WorkshopPlanningStatus, string> = {
  scheduled: dsBadgeInfo,
  confirmed: dsBadgeOk,
  rescheduled: dsBadgeWarn,
  cancelled: dsBadgeNeutral,
  completed: dsBadgeNeutral,
};
