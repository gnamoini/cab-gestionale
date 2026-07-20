import { ricambiUnifiedTableConfig, topClientiInterventiTableConfig, topClientiTableConfig, topMezziTableConfig, topRicambiTableConfig } from "@/lib/report/design-system/table-configs/clienti";
import {
  crossClienteTableConfig,
  crossMezzoCostTableConfig,
  crossOutlierTableConfig,
} from "@/lib/report/design-system/table-configs/cross";
import {
  coperturaBassaTableConfig,
  lavMtbfTableConfig,
  lavRecidivaTableConfig,
  lavSlaTableConfig,
  lavStatoAgingTableConfig,
  lavorazioniMensileTableConfig,
  magazzinoRischioMatrixTableConfig,
  ordiniFornitoriTableConfig,
  orePerDipendenteTableConfig,
  sottoScortaMinTableConfig,
  sottoScortaTableConfig,
} from "@/lib/report/design-system/table-configs/lavorazioni";
import type { ReportTableConfig } from "@/lib/report/design-system/table-configs/types";

export const REPORT_TABLE_CONFIGS: Record<string, ReportTableConfig> = {
  [topClientiTableConfig.id]: topClientiTableConfig,
  [topRicambiTableConfig.id]: topRicambiTableConfig,
  [ricambiUnifiedTableConfig.id]: ricambiUnifiedTableConfig,
  [topMezziTableConfig.id]: topMezziTableConfig,
  [topClientiInterventiTableConfig.id]: topClientiInterventiTableConfig,
  [lavorazioniMensileTableConfig.id]: lavorazioniMensileTableConfig,
  [lavSlaTableConfig.id]: lavSlaTableConfig,
  [lavRecidivaTableConfig.id]: lavRecidivaTableConfig,
  [lavStatoAgingTableConfig.id]: lavStatoAgingTableConfig,
  [lavMtbfTableConfig.id]: lavMtbfTableConfig,
  [orePerDipendenteTableConfig.id]: orePerDipendenteTableConfig,
  [sottoScortaTableConfig.id]: sottoScortaTableConfig,
  [sottoScortaMinTableConfig.id]: sottoScortaMinTableConfig,
  [coperturaBassaTableConfig.id]: coperturaBassaTableConfig,
  [magazzinoRischioMatrixTableConfig.id]: magazzinoRischioMatrixTableConfig,
  [ordiniFornitoriTableConfig.id]: ordiniFornitoriTableConfig,
  [crossOutlierTableConfig.id]: crossOutlierTableConfig,
  [crossClienteTableConfig.id]: crossClienteTableConfig,
  [crossMezzoCostTableConfig.id]: crossMezzoCostTableConfig,
};

export function getReportTableConfig(configId: string): ReportTableConfig {
  const config = REPORT_TABLE_CONFIGS[configId];
  if (!config) throw new Error(`report table config not found: ${configId}`);
  return config;
}

export type ReportTableConfigId = keyof typeof REPORT_TABLE_CONFIGS;
