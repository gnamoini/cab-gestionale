import type { ReportDataPrimitiveKind, ReportPrimitiveKind } from "@/components/report/design-system/contracts/primitive-contract";

/** Primitive dichiarate per sezione — coverage AST (declared ⊆ actual ⊆ declared). */
export const REPORT_SECTION_PRIMITIVE_CONTRACT = {
  lavorazioni: ["metric-card", "chart", "matrix", "data-table"] as const,
  dati_economici: ["data-table"] as const,
  analisi_incrociate: ["chart", "matrix", "data-table"] as const,
  magazzino_ricambi: ["data-table", "matrix"] as const,
  clienti_mezzi: ["metric-card", "embedded"] as const,
  ore_lavorate: ["metric-card", "chart", "data-table", "embedded"] as const,
  analisi_ai: ["narrative", "embedded"] as const,
} as const satisfies Record<string, readonly ReportPrimitiveKind[]>;

export type ReportSectionPrimitiveContractKey = keyof typeof REPORT_SECTION_PRIMITIVE_CONTRACT;

/** File sezione → chiave contract. */
export const REPORT_SECTION_FILE_TO_CONTRACT_KEY: Record<string, ReportSectionPrimitiveContractKey> = {
  "report-lavorazioni-section.tsx": "lavorazioni",
  "report-economici-section.tsx": "dati_economici",
  "report-cross-section.tsx": "analisi_incrociate",
  "report-magazzino-section.tsx": "magazzino_ricambi",
  "report-clienti-mezzi-section.tsx": "clienti_mezzi",
  "report-ore-section.tsx": "ore_lavorate",
  "report-ai-section.tsx": "analisi_ai",
};

/**
 * Sezioni non ancora migrate — scadenza Sprint 3.5 (lavorazioni) / Sprint 5 (resto).
 * Vuoto quando enforcement pieno attivo.
 */
export const COVERAGE_MIGRATION_ALLOWLIST: readonly ReportSectionPrimitiveContractKey[] = [] as const;

/** Metric primitives rendered via layout delegate (hub v2). */
export const REPORT_SECTION_PRIMITIVE_LAYOUT_DELEGATES: Record<
  string,
  { layoutFile: string; primitives: readonly ReportDataPrimitiveKind[] }
> = {
  "report-economici-section.tsx": {
    layoutFile: "components/report/sections/report-economic-metrics-layout.tsx",
    primitives: ["metric-card"],
  },
  "report-magazzino-section.tsx": {
    layoutFile: "components/report/layout/report-magazzino-hero-kpi-section.tsx",
    primitives: ["metric-card"],
  },
};
