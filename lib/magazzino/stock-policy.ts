import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";

/** Soglie copertura scorta configurabili (R-25). */
export type MagazzinoStockPolicy = {
  criticalCoverageDays: number;
  warningCoverageDays: number;
};

export const DEFAULT_MAGAZZINO_STOCK_POLICY: MagazzinoStockPolicy = {
  criticalCoverageDays: 7,
  warningCoverageDays: 30,
};

export const MAGAZZINO_STOCK_POLICY_SETTING = {
  module: CAB_SETTINGS_MODULE.magazzino,
  key: "stock_policy" as const,
};

export function parseMagazzinoStockPolicy(raw: unknown): MagazzinoStockPolicy {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_MAGAZZINO_STOCK_POLICY };
  const o = raw as Record<string, unknown>;
  const critical = Number(o.criticalCoverageDays);
  const warning = Number(o.warningCoverageDays);
  return {
    criticalCoverageDays: Number.isFinite(critical) && critical > 0 ? critical : DEFAULT_MAGAZZINO_STOCK_POLICY.criticalCoverageDays,
    warningCoverageDays: Number.isFinite(warning) && warning > 0 ? warning : DEFAULT_MAGAZZINO_STOCK_POLICY.warningCoverageDays,
  };
}

export type StockOperationalStatus = "normale" | "riordino" | "critico" | "sconosciuto";

export function resolveStockOperationalStatus(input: {
  scorta: number;
  scortaMinima: number;
  avgMonthlyConsumption: number | null;
  policy?: MagazzinoStockPolicy;
}): StockOperationalStatus {
  const policy = input.policy ?? DEFAULT_MAGAZZINO_STOCK_POLICY;
  const scorta = Math.max(0, Math.round(input.scorta));
  const min = Math.max(0, Math.round(input.scortaMinima));
  if (scorta < min) return "riordino";

  const avg = input.avgMonthlyConsumption;
  if (avg == null || !Number.isFinite(avg) || avg <= 0) {
    return scorta >= min ? "normale" : "riordino";
  }

  const daily = avg / 30;
  const coverageDays = daily > 0 ? scorta / daily : Infinity;
  if (coverageDays < policy.criticalCoverageDays) return "critico";
  if (coverageDays < policy.warningCoverageDays) return "riordino";
  return "normale";
}

export function formatCoverageLabel(scorta: number, avgMonthly: number | null): string {
  if (avgMonthly == null || !Number.isFinite(avgMonthly) || avgMonthly <= 0) return "—";
  const daily = avgMonthly / 30;
  const days = scorta / daily;
  if (!Number.isFinite(days) || days <= 0) return "—";
  if (days < 14) return `${Math.round(days)} giorni`;
  const months = days / 30;
  if (months < 24) return `${months.toFixed(1).replace(".", ",")} mesi`;
  return `${Math.round(months)} mesi`;
}
