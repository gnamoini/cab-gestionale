/**
 * SSOT: BI section → metric → visualization tier.
 * Populated from docs/report-data-inventory.md (approval gate 2026-08-21).
 * Do not add metrics here without inventory sign-off.
 */

export type BiVisualizationTier = "executive" | "advanced" | "drilldown_only";

export type BiSectionDataMapEntry = {
  metricId: string;
  section: string;
  visual: string;
  tier: BiVisualizationTier;
  priority: "P0" | "P1" | "P2" | "P3";
  motivazione: string;
  lazy: boolean;
};

/** Approved metrics post Milestone A gate — Wave 1 + Wave 2 subset. */
export const BI_SECTION_DATA_MAP: readonly BiSectionDataMapEntry[] = [
  // Executive (unchanged — density cap 6)
  { metricId: "lav-chiusi", section: "executive", visual: "kpi", tier: "executive", priority: "P0", motivazione: "Throughput chiusure", lazy: false },
  { metricId: "lav-aperti", section: "executive", visual: "kpi", tier: "executive", priority: "P0", motivazione: "Backlog operativo", lazy: false },
  { metricId: "lav_late_sla", section: "executive", visual: "kpi", tier: "executive", priority: "P0", motivazione: "Criticità SLA", lazy: false },
  { metricId: "eco_fatturato", section: "executive", visual: "kpi", tier: "executive", priority: "P0", motivazione: "Ricavi emessi", lazy: false },
  { metricId: "eco_da_incassare", section: "executive", visual: "kpi", tier: "executive", priority: "P0", motivazione: "Crediti aperti", lazy: false },
  { metricId: "eco_importo_scaduto", section: "executive", visual: "kpi", tier: "executive", priority: "P0", motivazione: "Crediti scaduti — decisione P0", lazy: false },
  { metricId: "scorta", section: "magazzino", visual: "kpi", tier: "advanced", priority: "P0", motivazione: "Rischio stock (spostato da executive P10)", lazy: true },

  // Economia — advanced
  { metricId: "eco_incassato", section: "economia", visual: "kpi+trend", tier: "advanced", priority: "P0", motivazione: "Cassa periodo", lazy: true },
  { metricId: "eco_margine_operativo_stimato", section: "economia", visual: "kpi", tier: "advanced", priority: "P0", motivazione: "Margine stimato", lazy: true },
  { metricId: "eco_preventivi", section: "economia", visual: "kpi", tier: "advanced", priority: "P0", motivazione: "Pipeline preventivi", lazy: true },
  { metricId: "eco_preventivi_approvati", section: "economia", visual: "kpi", tier: "advanced", priority: "P1", motivazione: "Preventivi contabilizzabili", lazy: true },
  { metricId: "eco_ddt", section: "economia", visual: "kpi", tier: "advanced", priority: "P1", motivazione: "Volume documenti trasporto (non ricavo)", lazy: true },

  // Lavorazioni
  { metricId: "lav-periodo", section: "lavorazioni", visual: "kpi+trend", tier: "advanced", priority: "P0", motivazione: "Carico ingressi", lazy: true },
  { metricId: "lav-tempo", section: "lavorazioni", visual: "kpi", tier: "advanced", priority: "P0", motivazione: "Velocità chiusura", lazy: true },
  { metricId: "lav_cancelled", section: "lavorazioni", visual: "kpi", tier: "advanced", priority: "P1", motivazione: "Annullamenti (trust: data ingresso)", lazy: true },

  // Magazzino
  { metricId: "ric-usati", section: "magazzino", visual: "kpi+trend", tier: "advanced", priority: "P0", motivazione: "Consumi periodo", lazy: true },
  { metricId: "cap", section: "magazzino", visual: "kpi", tier: "advanced", priority: "P0", motivazione: "Capitale immobilizzato", lazy: true },
  { metricId: "mag_movement_value", section: "magazzino", visual: "kpi", tier: "advanced", priority: "P1", motivazione: "Valore movimentato", lazy: true },
  { metricId: "mag_orders", section: "magazzino", visual: "kpi", tier: "advanced", priority: "P1", motivazione: "Ordini fornitori periodo", lazy: true },

  // Clienti
  { metricId: "clienti", section: "clienti", visual: "kpi", tier: "advanced", priority: "P1", motivazione: "Clienti attivi periodo", lazy: true },
  { metricId: "eco_fatturato", section: "clienti", visual: "pareto+drill", tier: "advanced", priority: "P0", motivazione: "Concentrazione ricavi", lazy: true },

  // Risorse
  { metricId: "presence_hours_total", section: "risorse", visual: "kpi+trend", tier: "advanced", priority: "P0", motivazione: "Ore presenza", lazy: true },
  { metricId: "actual_labor_hours_total", section: "risorse", visual: "kpi", tier: "advanced", priority: "P0", motivazione: "Ore consuntive", lazy: true },
  { metricId: "ore_straordinari", section: "risorse", visual: "kpi", tier: "advanced", priority: "P1", motivazione: "Straordinari periodo", lazy: true },
  { metricId: "saturazione_team", section: "risorse", visual: "kpi", tier: "advanced", priority: "P1", motivazione: "Utilizzo capacità", lazy: true },

  // Commerciale / preventivi
  { metricId: "eco_preventivi", section: "preventivi", visual: "kpi", tier: "advanced", priority: "P0", motivazione: "Volume preventivi", lazy: true },
  { metricId: "eco_preventivi_approvati", section: "preventivi", visual: "kpi", tier: "advanced", priority: "P0", motivazione: "Preventivi accettati", lazy: true },
  { metricId: "eco_preventivi_valore", section: "preventivi", visual: "kpi", tier: "advanced", priority: "P0", motivazione: "Valore commerciale pipeline", lazy: true },
  { metricId: "win_rate_preventivi", section: "preventivi", visual: "kpi", tier: "advanced", priority: "P1", motivazione: "Efficacia commerciale", lazy: true },

  // Cross — advanced KPI grid (pairwise trends in cross-domain section)
  { metricId: "cross_efficiency", section: "cross", visual: "kpi", tier: "advanced", priority: "P2", motivazione: "Chiusure per ora", lazy: true },
  { metricId: "cross_parts_job", section: "cross", visual: "kpi", tier: "advanced", priority: "P2", motivazione: "Ricambi per intervento", lazy: true },
  { metricId: "cross_cost_job", section: "cross", visual: "kpi", tier: "advanced", priority: "P2", motivazione: "Costo medio lavorazione", lazy: true },
  { metricId: "cross_value_hour", section: "cross", visual: "kpi", tier: "advanced", priority: "P2", motivazione: "Valore per ora", lazy: true },
  // Fleet (Wave 2 — clienti/mezzi context)
  { metricId: "flotta-officina", section: "clienti", visual: "kpi", tier: "advanced", priority: "P2", motivazione: "Proxy mezzi fermi", lazy: true },
];

export function listApprovedMetricIdsForSection(section: string): string[] {
  const ids = new Set<string>();
  for (const row of BI_SECTION_DATA_MAP) {
    if (row.section === section) ids.add(row.metricId);
  }
  return [...ids];
}

export function getExecutiveApprovedIds(): string[] {
  return BI_SECTION_DATA_MAP.filter((r) => r.tier === "executive").map((r) => r.metricId);
}
