import { topClientiInterventiTableConfig, topClientiTableConfig, topMezziTableConfig, topRicambiTableConfig } from "@/lib/report/design-system/table-configs/clienti";
import { lavorazioniMensileTableConfig } from "@/lib/report/design-system/table-configs/lavorazioni";
import type { ReportTableConfig } from "@/lib/report/design-system/table-configs/types";

export const REPORT_TABLE_CONFIGS: Record<string, ReportTableConfig> = {
  [topClientiTableConfig.id]: topClientiTableConfig,
  [topRicambiTableConfig.id]: topRicambiTableConfig,
  [topMezziTableConfig.id]: topMezziTableConfig,
  [topClientiInterventiTableConfig.id]: topClientiInterventiTableConfig,
  [lavorazioniMensileTableConfig.id]: lavorazioniMensileTableConfig,
};

export function getReportTableConfig(configId: string): ReportTableConfig {
  const config = REPORT_TABLE_CONFIGS[configId];
  if (!config) throw new Error(`report table config not found: ${configId}`);
  return config;
}

export type ReportTableConfigId = keyof typeof REPORT_TABLE_CONFIGS;
