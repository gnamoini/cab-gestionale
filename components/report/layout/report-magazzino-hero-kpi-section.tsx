"use client";

import { useMemo } from "react";
import { ReportDomainMetricsGrid } from "@/components/report/design-system";
import { ReportUnifiedKpiGrid } from "@/components/report/report-unified-kpi-grid";
import { reportSectionGroupDescClass, reportSubsectionTitleClass } from "@/components/report/report-ui-tokens";
import {
  MAGAZZINO_UNIFIED_PRIMARY_KPI_IDS,
  MAGAZZINO_UNIFIED_SECONDARY_KPI_IDS,
} from "@/lib/report/kpi-display-clusters";
import type { UnifiedKpiDisplayItem } from "@/lib/report/kpi-performance/merge-unified-kpi-display";
import type { ReportCompareMode } from "@/lib/report/date-ranges";
import type { ReportDomainMetric } from "@/lib/report/report-domain-types";

function pickByOrder(items: readonly UnifiedKpiDisplayItem[], order: readonly string[]): UnifiedKpiDisplayItem[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const out: UnifiedKpiDisplayItem[] = [];
  for (const id of order) {
    const item = byId.get(id);
    if (item) out.push(item);
  }
  return out;
}

export function ReportMagazzinoHeroKpiSection({
  unifiedItems,
  supplementaryItems,
  domainMetrics,
  compareMode = "none",
}: {
  unifiedItems: readonly UnifiedKpiDisplayItem[];
  supplementaryItems: readonly UnifiedKpiDisplayItem[];
  domainMetrics: readonly ReportDomainMetric[];
  compareMode?: ReportCompareMode;
}) {
  const { primary, secondary } = useMemo(() => {
    const merged = [...unifiedItems, ...supplementaryItems];
    return {
      primary: pickByOrder(merged, MAGAZZINO_UNIFIED_PRIMARY_KPI_IDS),
      secondary: pickByOrder(merged, MAGAZZINO_UNIFIED_SECONDARY_KPI_IDS),
    };
  }, [unifiedItems, supplementaryItems]);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className={reportSectionGroupDescClass}>
          Stock, movimenti e rischio nel periodo. Le pillole indicano l&apos;affidabilità del dato (esatto, stima,
          istantaneo).
        </p>
        {primary.length > 0 ? (
          <div className="mt-3">
            <ReportUnifiedKpiGrid items={primary} variant="hero" compareMode={compareMode} />
          </div>
        ) : null}
      </div>

      {domainMetrics.length > 0 ? (
        <ReportDomainMetricsGrid metrics={[...domainMetrics]} compareMode={compareMode} />
      ) : null}

      {secondary.length > 0 ? (
        <section className="min-w-0 space-y-2" aria-labelledby="report-magazzino-secondary-kpi">
          <h2 id="report-magazzino-secondary-kpi" className={reportSubsectionTitleClass}>
            Indicatori di rischio
          </h2>
          <ReportUnifiedKpiGrid items={secondary} variant="compact" compareMode={compareMode} />
        </section>
      ) : null}
    </div>
  );
}
