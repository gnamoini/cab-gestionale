/** Metriche hero sezione DATI ECONOMICI — scan 30s. */
export const ECONOMIC_HERO_METRIC_IDS = [
  "eco_invoices",
  "eco_incassato",
  "eco_da_incassare",
  "eco_margine_pct",
] as const;

/** KPI secondari sotto gli hero. */
export const ECONOMIC_SECONDARY_METRIC_IDS = [
  "dso",
  "eco_tasso_incasso",
  "eco_valore_medio_intervento",
] as const;

/** Metriche analisi pipeline / crediti. */
export const ECONOMIC_ANALYSIS_METRIC_IDS = [
  "eco_preventivi",
  "eco_scadute",
  "win_rate_preventivi",
  "eco_residuo_da_fatturare",
] as const;

export const ECONOMIC_DETAIL_METRIC_IDS = ["eco_margine_operativo_stimato"] as const;

export const ECONOMIC_ALL_LAYOUT_METRIC_IDS = [
  ...ECONOMIC_HERO_METRIC_IDS,
  ...ECONOMIC_SECONDARY_METRIC_IDS,
  ...ECONOMIC_ANALYSIS_METRIC_IDS,
  ...ECONOMIC_DETAIL_METRIC_IDS,
] as const;
