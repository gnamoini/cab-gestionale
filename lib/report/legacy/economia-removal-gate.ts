/**
 * Economia legacy removal gate (§4.0) — all items must pass before dati_economici REMOVED.
 * Margin waterfall: formally BLOCKED; eco_margine_operativo_stimato is the approved replacement KPI.
 */

export type EconomiaRemovalGateItem = {
  id: string;
  label: string;
  passed: boolean;
  notes?: string;
};

export const ECONOMIA_REMOVAL_GATE: readonly EconomiaRemovalGateItem[] = [
  { id: "eco_importo_scaduto", label: "eco_importo_scaduto engine + drill", passed: true },
  { id: "revenue_collection", label: "Revenue collection chart in BI", passed: true },
  { id: "ar_aging", label: "AR aging chart in BI", passed: true },
  { id: "preventivi_funnel", label: "Preventivi funnel in BI", passed: true },
  {
    id: "cliente_heatmap",
    label: "Cliente heatmap with snapshot semantics",
    passed: true,
    notes: "Fotografia al anchor; no period compare",
  },
  {
    id: "margin_visualization",
    label: "Margin visualization",
    passed: true,
    notes: "BLOCKED waterfall; replacement = eco_margine_operativo_stimato KPI+trend",
  },
  { id: "drilldown", label: "Economia KPI drill-down", passed: true },
  { id: "rbac", label: "RBAC fatturazione module", passed: true },
  { id: "ux_states", label: "loading/empty/error/unavailable", passed: true },
] as const;

export function isEconomiaRemovalGatePassed(): boolean {
  return ECONOMIA_REMOVAL_GATE.every((item) => item.passed);
}
