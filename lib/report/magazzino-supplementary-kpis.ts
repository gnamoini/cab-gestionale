import { UNIFIED_KPI_DISPLAY } from "@/lib/report/kpi-performance/kpi-display-catalog";
import type { UnifiedKpiDisplayItem } from "@/lib/report/kpi-performance/merge-unified-kpi-display";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { DateRange } from "@/lib/report/date-ranges";
import {
  computeAvgGiorniCopertura,
  computeRotazioneStock,
  countDeadStock,
  sumValoreStockARischio,
} from "@/lib/report/magazzino-analytics";

function fmtEur(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export function buildMagazzinoSupplementaryKpiItems(input: {
  prodotti: readonly RicambioMagazzino[];
  magLog: readonly MagazzinoChangeLogEntry[];
  range: DateRange;
  anchor: Date;
}): UnifiedKpiDisplayItem[] {
  const { prodotti, magLog, range, anchor } = input;
  const items: UnifiedKpiDisplayItem[] = [];

  const valoreRischio = sumValoreStockARischio(prodotti);
  items.push({
    id: "mag-valore-rischio",
    label: "Valore stock a rischio",
    value: fmtEur(valoreRischio),
    compareRows: null,
    description: UNIFIED_KPI_DISPLAY["mag-valore-rischio"]!.description,
    compact: true,
  });

  const copertura = computeAvgGiorniCopertura(prodotti, magLog, range);
  items.push({
    id: "mag-copertura-media",
    label: "Copertura media",
    value: copertura != null ? `${copertura} gg` : "—",
    compareRows: null,
    description: UNIFIED_KPI_DISPLAY["mag-copertura-media"]!.description,
    compact: true,
  });

  const dead = countDeadStock(prodotti, magLog, anchor);
  items.push({
    id: "mag-dead-stock",
    label: "Articoli fermi",
    value: String(dead),
    sub: "90 gg senza uscite",
    compareRows: null,
    description: UNIFIED_KPI_DISPLAY["mag-dead-stock"]!.description,
    compact: true,
  });

  const rot = computeRotazioneStock(prodotti, magLog, range);
  items.push({
    id: "mag-rotazione",
    label: "Rotazione stock",
    value: rot != null ? rot.toLocaleString("it-IT", { maximumFractionDigits: 2 }) : "—",
    compareRows: null,
    description: UNIFIED_KPI_DISPLAY["mag-rotazione"]!.description,
    compact: true,
  });

  return items;
}
