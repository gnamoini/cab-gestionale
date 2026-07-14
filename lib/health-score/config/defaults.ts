import type { HealthScoreConfig } from "@/lib/health-score/config/schema";

export const HEALTH_SCORE_V2_DEFAULTS: HealthScoreConfig = {
  configVersion: "v2.0.0",
  sections: {
    produzione: 0.3,
    magazzino: 0.2,
    personale: 0.2,
    economico: 0.2,
    rischio: 0.1,
  },
  targets: {
    backlog: 30,
    backlog_avg_age_days: 14,
    completate_periodo: 20,
    close_time_days: 7,
    urgent_turnaround_days: 3,
    sla_late_pct: 15,
    stock_critical: 0,
    mag_movements: 50,
    hours_worked: 400,
    overtime_pct: 10,
    absence_pct: 2,
    preventivi_emessi: 5,
    fatturato: 50000,
    incassato: 40000,
  },
  smoothing: { alpha: 0.8 },
  confidence: { lowMultiplier: 0.25, mediumMultiplier: 0.65 },
  dataQuality: { lowMultiplier: 0.5, mediumMultiplier: 0.75 },
  normalizers: { kTrend: 25, kLevel: 1 },
  riskCap: 25,
  dependencies: [
    { kpiId: "close-time", requires: ["backlog"], rule: "downweight_if_backlog_high", backlogThreshold: 50 },
    { kpiId: "fatturato", requires: ["completate"], rule: "suppress_if_completate_zero" },
    { kpiId: "incassato", requires: ["completate"], rule: "suppress_if_completate_zero" },
  ],
};
