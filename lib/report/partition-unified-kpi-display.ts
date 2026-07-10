import type { UnifiedKpiDisplayItem } from "@/lib/report/kpi-performance/merge-unified-kpi-display";
import {
  CLIENTI_MEZZI_UNIFIED_KPI_IDS,
  ECONOMIC_ZONE_KPI_IDS,
  LAVORAZIONI_UNIFIED_KPI_IDS,
  MAGAZZINO_UNIFIED_KPI_IDS,
} from "@/lib/report/kpi-display-clusters";

export type PartitionedUnifiedKpis = {
  lavorazioni: UnifiedKpiDisplayItem[];
  fleet: UnifiedKpiDisplayItem[];
  magazzino: UnifiedKpiDisplayItem[];
  economic: UnifiedKpiDisplayItem[];
};

function pickByOrder(
  items: readonly UnifiedKpiDisplayItem[],
  order: readonly string[],
): UnifiedKpiDisplayItem[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const out: UnifiedKpiDisplayItem[] = [];
  for (const id of order) {
    const item = byId.get(id);
    if (item) out.push(item);
  }
  return out;
}

/** Suddivide KPI unificati per sezione report senza ricalcolare valori. Ogni id compare una sola volta. */
export function partitionUnifiedKpiDisplay(items: readonly UnifiedKpiDisplayItem[]): PartitionedUnifiedKpis {
  const used = new Set<string>();

  const lavorazioni = pickByOrder(items, LAVORAZIONI_UNIFIED_KPI_IDS);
  for (const i of lavorazioni) used.add(i.id);

  const fleet = pickByOrder(
    items.filter((i) => !used.has(i.id)),
    CLIENTI_MEZZI_UNIFIED_KPI_IDS,
  );
  for (const i of fleet) used.add(i.id);

  const magazzino = pickByOrder(
    items.filter((i) => !used.has(i.id)),
    MAGAZZINO_UNIFIED_KPI_IDS,
  );
  for (const i of magazzino) used.add(i.id);

  const economic = pickByOrder(
    items.filter((i) => !used.has(i.id)),
    ECONOMIC_ZONE_KPI_IDS,
  );

  return { lavorazioni, fleet, magazzino, economic };
}
