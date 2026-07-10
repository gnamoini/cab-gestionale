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
  "lav-media-settimanale",
  "lav-chiusi",
  "lav-saldo-periodo",
  "lav-aperti",
  "lav-tempo",
] as const;

/** KPI hero in sezione lavorazioni (leggibilità 30s). */
export const LAVORAZIONI_UNIFIED_PRIMARY_KPI_IDS = [
  "lav-periodo",
  "lav-chiusi",
  "lav-saldo-periodo",
  "lav-media-settimanale",
] as const;

/** KPI secondari lavorazioni — griglia compatta sotto gli hero. */
export const LAVORAZIONI_UNIFIED_SECONDARY_KPI_IDS = ["lav-aperti", "lav-tempo"] as const;

export const CLIENTI_MEZZI_UNIFIED_KPI_IDS = ["clienti", "flotta-officina", "mezzi"] as const;

export const MAGAZZINO_UNIFIED_KPI_IDS = ["scorta"] as const;

export const ECONOMIC_ZONE_KPI_IDS = ["cost-tot", "cap", "ric-usati"] as const;

export const KPI_TRUST_BY_ID: Record<string, ReportKpiTrust> = {
  "lav-periodo": "exact",
  "lav-media-settimanale": "exact",
  "lav-chiusi": "exact",
  "lav-aperti": "exact",
  "lav-tempo": "exact",
  "flotta-officina": "proxy",
  cost: "snapshot",
  "ric-usati": "exact",
  "cost-tot": "partial",
  clienti: "exact",
  mezzi: "snapshot",
  scorta: "exact",
};

export function trustForKpiId(id: string): ReportKpiTrust | undefined {
  return KPI_TRUST_BY_ID[id];
}
