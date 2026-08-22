/**
 * SSOT semantica metriche economiche Report P0.
 * revenue = fatture emesse (data_emissione), NON incasso.
 */

export type EconomicConceptId =
  | "revenue"
  | "collected"
  | "receivables"
  | "overdue_receivables"
  | "estimated_operational_margin"
  | "quote_conversion_pct";

export type EconomicMetricSemantics = {
  conceptId: EconomicConceptId;
  metricId: string;
  formulaId: string;
  semantics: "flow" | "snapshot";
  trust: "verified" | "estimated" | "partial" | "not_available";
  /** P0-B: conversione commerciale non determinabile dal funnel attuale (solo bozza/inviato/annullato). */
  implementationStatus: "active" | "blocked";
  notes?: string;
};

export const ECONOMIC_METRIC_SEMANTICS: Record<
  Exclude<EconomicConceptId, "quote_conversion_pct">,
  EconomicMetricSemantics
> = {
  revenue: {
    conceptId: "revenue",
    metricId: "eco_fatturato",
    formulaId: "invoice_emitted_in_period",
    semantics: "flow",
    trust: "verified",
    implementationStatus: "active",
    notes: "Fatture emesse nel periodo (data_emissione); escluse bozza/da_verificare/annullata.",
  },
  collected: {
    conceptId: "collected",
    metricId: "eco_incassato",
    formulaId: "payments_in_period",
    semantics: "flow",
    trust: "verified",
    implementationStatus: "active",
  },
  receivables: {
    conceptId: "receivables",
    metricId: "eco_da_incassare",
    formulaId: "invoice_residuo_snapshot",
    semantics: "snapshot",
    trust: "verified",
    implementationStatus: "active",
  },
  overdue_receivables: {
    conceptId: "overdue_receivables",
    metricId: "eco_importo_scaduto",
    formulaId: "invoice_overdue_residuo_snapshot",
    semantics: "snapshot",
    trust: "verified",
    implementationStatus: "active",
    notes:
      "Somma residuo dove data_scadenza < oggi (UTC); distinto da da incassare; pagamenti parziali → solo residuo.",
  },
  estimated_operational_margin: {
    conceptId: "estimated_operational_margin",
    metricId: "eco_margine_operativo_stimato",
    formulaId: "revenue_minus_labor_minus_parts",
    semantics: "flow",
    trust: "estimated",
    implementationStatus: "active",
    notes: "fatturato − manodopera schede − costo ricambi mag log; non contabile.",
  },
};

/** Alias test/documentazione → metricId canonico. */
export const P0_METRIC_ALIASES: Record<string, string> = {
  work_orders_opened: "lav-periodo",
  work_orders_completed: "lav-chiusi",
  backlog_open: "lav-aperti",
  quote_count: "eco_preventivi",
  quote_value: "eco_preventivi",
  stock_value: "cap",
  labor_hours: "presence_hours_total",
  labor_cost: "manodopera_cost",
};

/**
 * Conversione preventivi → lavorazione/fattura: BLOCKED in P0.
 * Workflow attuale: bozza | inviato | annullato — nessuno stato "accettato/convertito".
 * countPreventiviApprovatiInRange conta solo inviato+inviatoAt (invio commerciale, non conversione).
 */
export const QUOTE_CONVERSION_PCT_SEMANTICS: EconomicMetricSemantics = {
  conceptId: "quote_conversion_pct",
  metricId: "quote_conversion_pct",
  formulaId: "blocked_pending_funnel_definition",
  semantics: "flow",
  trust: "not_available",
  implementationStatus: "blocked",
  notes:
    "Semantica conversione non determinabile: manca evento accettazione/conversione nel workflow preventivi.",
};
