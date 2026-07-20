/** Titoli umani per insight rules — UI e narrative, mai ruleKey raw. */
const INSIGHT_RULE_LABELS: Record<string, string> = {
  LAV_LOAD_EXCEEDS_CLOSURES: "Carico lavorazioni vs chiusure",
  LAV_SLA_BREACH: "Superamento SLA",
  LAV_OPEN_BACKLOG: "Backlog aperto",
  LAV_LOW_CLOSURES: "Chiusure assenti",
  LAV_AVG_CLOSE_SLOW: "Tempo chiusura elevato",
  LAV_MANUAL_OVERRIDE: "Override manuali",
  LAV_CLOSURES_DELTA: "Variazione chiusure",
  MAG_LOW_STOCK: "Sotto scorta",
  MAG_COVERAGE_CRITICAL: "Copertura critica",
  MAG_DEAD_STOCK: "Stock fermo",
  MAG_PARTS_SPIKE: "Picco consumo ricambi",
  MAG_PARTS_USED: "Ricambi utilizzati",
  MAG_MOVEMENT_VALUE: "Valore movimenti",
  ORE_HOURS_LOW: "Ore assenti",
  ORE_PER_JOB: "Ore per lavorazione",
  ORE_MAINTENANCE_COST: "Costi manutenzione",
  ORE_OVERTIME: "Straordinari",
  ECO_INVOICES_PENDING: "Fatturazione incompleta",
  ECO_RECEIVABLES: "Crediti da incassare",
  ECO_DSO_HIGH: "DSO elevato",
  ECO_COLLECTION_LOW: "Incassi bassi",
  ECO_MARGIN_NEGATIVE: "Margine negativo",
  ECO_CONCENTRATION_RISK: "Concentrazione fatturato",
  CROSS_COST_JOB_SPIKE: "Costo per lavorazione in aumento",
  CROSS_VALUE_HOUR_DROP: "Valore orario in calo",
  CROSS_SOURCE_PENDING: "Analisi incrociate parziali",
  COMP_REVISION_EXPIRED: "Revisioni scadute",
  COMP_SERVICE_DUE: "Tagliandi in scadenza",
};

export function insightRuleLabel(ruleKey: string): string {
  return INSIGHT_RULE_LABELS[ruleKey] ?? ruleKey.replaceAll("_", " ").toLowerCase();
}
