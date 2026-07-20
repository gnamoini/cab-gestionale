/**
 * Metadati UI per KPI report (cluster, fiducia) — solo presentazione.
 */

export type ReportKpiCluster = "executive" | "operations" | "fleet" | "economic";

export type ReportKpiTrust = "exact" | "partial" | "proxy" | "snapshot";

export const REPORT_KPI_TRUST_LABELS: Record<ReportKpiTrust, string> = {
  exact: "Esatto",
  partial: "Stima",
  proxy: "Proxy",
  snapshot: "Istantaneo",
};

export const LAVORAZIONI_UNIFIED_KPI_IDS = [
  "lav-periodo",
  "lav-chiusi",
  "lav-aperti",
  "lav_late_sla",
  "lav-tempo",
  "lav-saldo-periodo",
  "lav-media-settimanale",
] as const;

/** KPI hero in sezione lavorazioni (leggibilità 30s). */
export const LAVORAZIONI_UNIFIED_PRIMARY_KPI_IDS = [
  "lav-periodo",
  "lav-chiusi",
  "lav-aperti",
  "lav_late_sla",
] as const;

/** KPI secondari lavorazioni — griglia compatta sotto gli hero. */
export const LAVORAZIONI_UNIFIED_SECONDARY_KPI_IDS = [
  "lav-tempo",
  "lav-saldo-periodo",
  "lav-media-settimanale",
] as const;

export const CLIENTI_MEZZI_UNIFIED_KPI_IDS = [
  "clienti",
  "fleet-disponibilita",
  "flotta-officina",
  "clienti-sotto-soglia",
  "fleet-tempo-fermo",
  "fleet-mezzi-critici",
] as const;

export const MAGAZZINO_UNIFIED_KPI_IDS = [
  "cap",
  "scorta",
  "ric-usati",
  "mag-entrate",
  "mag-valore-rischio",
  "mag-copertura-media",
  "mag-dead-stock",
] as const;

/** KPI hero sezione magazzino (leggibilità 30s). */
export const MAGAZZINO_UNIFIED_PRIMARY_KPI_IDS = [
  "cap",
  "scorta",
  "ric-usati",
  "mag-entrate",
] as const;

/** KPI secondari magazzino — griglia compatta sotto gli hero. */
export const MAGAZZINO_UNIFIED_SECONDARY_KPI_IDS = [
  "mag-valore-rischio",
  "mag-copertura-media",
  "mag-dead-stock",
  "mag-rotazione",
] as const;

/** ponytail: costi mostrati via waterfall in DATI ECONOMICI, non KPI unificati. */
export const ECONOMIC_ZONE_KPI_IDS = [] as const;

export const KPI_TRUST_BY_ID: Record<string, ReportKpiTrust> = {
  "lav-periodo": "exact",
  "lav-media-settimanale": "exact",
  "lav-chiusi": "exact",
  "lav-aperti": "exact",
  "lav-tempo": "exact",
  "flotta-officina": "proxy",
  "fleet-disponibilita": "proxy",
  "clienti-sotto-soglia": "proxy",
  "fleet-tempo-fermo": "partial",
  "fleet-mezzi-critici": "partial",
  cost: "snapshot",
  "ric-usati": "exact",
  "mag-entrate": "exact",
  "mag-valore-rischio": "exact",
  "mag-copertura-media": "partial",
  "mag-dead-stock": "exact",
  "mag-rotazione": "partial",
  "cost-tot": "partial",
  clienti: "exact",
  mezzi: "snapshot",
  scorta: "exact",
};

export function trustForKpiId(id: string): ReportKpiTrust | undefined {
  return KPI_TRUST_BY_ID[id];
}
