/** Label UI periodo KPI header dashboard (brief settimanale). */
export const CONTROL_TOWER_KPI_WINDOW_LABEL =
  "Da lunedì a oggi, confrontato con lo stesso periodo della settimana precedente." as const;

/** Label UI periodo KPI header dashboard (brief giornaliero). */
export const CONTROL_TOWER_KPI_DAY_WINDOW_LABEL = "Statistiche di oggi, senza confronto con periodi precedenti." as const;

/** Label UI periodo KPI header dashboard (brief mensile). */
export const CONTROL_TOWER_KPI_MONTH_WINDOW_LABEL =
  "Dal 1° del mese a oggi, confrontato con lo stesso periodo del mese precedente." as const;

/** Label UI stato operativo (health score rolling 30 giorni). */
export const OPERATIONAL_HEALTH_PERIOD_LABEL = "Ultimi 30 giorni vs periodo precedente" as const;

/** Label UI activity feed (finestra implicita: retention query log). */
export const CONTROL_TOWER_ACTIVITY_WINDOW_LABEL = "Ultime attività registrate" as const;

/** Giorni senza update → lavorazione ferma / bloccata. */
export const CONTROL_TOWER_STALE_UPDATE_DAYS = 3;

/** Giorni futuri calendario operativo compatto. */
export const CONTROL_TOWER_CALENDAR_FORWARD_DAYS = 7;

/** Max entità distinte per card activity feed. */
export const CONTROL_TOWER_ACTIVITY_PER_CARD = 5;

export { KPI_OPEN_LATE_DAYS_THRESHOLD as CONTROL_TOWER_LATE_INGRESS_DAYS } from "@/lib/report/kpi-performance/kpi-performance-constants";
