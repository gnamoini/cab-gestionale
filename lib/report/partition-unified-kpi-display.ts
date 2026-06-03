import type { UnifiedKpiDisplayItem } from "@/lib/report/kpi-performance/merge-unified-kpi-display";
import {
  ECONOMIC_ZONE_KPI_IDS,
  EXECUTIVE_KPI_IDS,
  FLEET_ZONE_KPI_IDS,
} from "@/lib/report/kpi-display-clusters";

export type PartitionedUnifiedKpis = {
  executive: UnifiedKpiDisplayItem[];
  fleet: UnifiedKpiDisplayItem[];
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

/** Suddivide KPI unificati per zona UI senza ricalcolare valori. Ogni id compare una sola volta. */
export function partitionUnifiedKpiDisplay(items: readonly UnifiedKpiDisplayItem[]): PartitionedUnifiedKpis {
  const used = new Set<string>();

  const executive = pickByOrder(items, EXECUTIVE_KPI_IDS);
  for (const i of executive) used.add(i.id);

  const fleet = pickByOrder(
    items.filter((i) => !used.has(i.id)),
    FLEET_ZONE_KPI_IDS,
  );
  for (const i of fleet) used.add(i.id);

  const economic = pickByOrder(
    items.filter((i) => !used.has(i.id)),
    ECONOMIC_ZONE_KPI_IDS,
  );

  return { executive, fleet, economic };
}
