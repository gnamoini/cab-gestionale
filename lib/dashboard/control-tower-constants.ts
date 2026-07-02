/** Label UI unica KPI header dashboard Control Tower. */
export const CONTROL_TOWER_KPI_WINDOW_LABEL = "Settimana corrente (lun–oggi)" as const;

/** Label UI activity feed (unico dominio rolling 7d). */
export const CONTROL_TOWER_ACTIVITY_WINDOW_LABEL = "Ultimi 7 giorni" as const;

/** Giorni senza update → lavorazione ferma / bloccata. */
export const CONTROL_TOWER_STALE_UPDATE_DAYS = 3;

/** Giorni futuri calendario operativo compatto. */
export const CONTROL_TOWER_CALENDAR_FORWARD_DAYS = 7;

/** Max eventi activity feed. */
export const CONTROL_TOWER_ACTIVITY_MAX = 20;

export { KPI_OPEN_LATE_DAYS_THRESHOLD as CONTROL_TOWER_LATE_INGRESS_DAYS } from "@/lib/report/kpi-performance/kpi-performance-constants";
