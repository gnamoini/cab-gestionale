import type { OperationalHealthTone } from "@/lib/dashboard/operational-health-score";

/** SSOT colori Stato operativo: rosso → giallo → verde (semaforo). */
export const HEALTH_SCORE_TONE_COLOR: Record<OperationalHealthTone, string> = {
  critical: "var(--cab-danger)",
  warn: "var(--cab-warning)",
  good: "color-mix(in srgb, var(--cab-success) 58%, var(--cab-warning))",
  excellent: "var(--cab-success)",
  neutral: "var(--cab-text-muted)",
};

export const HEALTH_SCORE_TONE_GLOW: Record<OperationalHealthTone, string> = {
  critical: "color-mix(in srgb, var(--cab-danger) 14%, transparent)",
  warn: "color-mix(in srgb, var(--cab-warning) 14%, transparent)",
  good: "color-mix(in srgb, var(--cab-success) 10%, transparent)",
  excellent: "color-mix(in srgb, var(--cab-success) 14%, transparent)",
  neutral: "color-mix(in srgb, var(--cab-border) 60%, transparent)",
};
