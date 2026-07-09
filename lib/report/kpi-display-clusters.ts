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

/** Ordine fisso KPI in executive overview (max 8). */
export const EXECUTIVE_KPI_IDS = [
  "lav-periodo",
  "lav-media-settimanale",
  "lav-chiusi",
  "lav-aperti",
  "lav-tempo",
  "cost-tot",
  "scorta",
  "clienti",
] as const;

/** KPI hero in panoramica esecutiva (leggibilità 30s). */
export const EXECUTIVE_PRIMARY_KPI_IDS = [
  "lav-periodo",
  "lav-chiusi",
  "lav-saldo-periodo",
  "clienti",
  "lav-media-settimanale",
] as const;

/** KPI secondari — stessa sezione, griglia compatta. */
export const EXECUTIVE_SECONDARY_KPI_IDS = ["lav-aperti", "lav-tempo", "scorta"] as const;

export const FLEET_ZONE_KPI_IDS = ["flotta-officina", "mezzi"] as const;

export const ECONOMIC_ZONE_KPI_IDS = ["cap", "ric-usati"] as const;

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
