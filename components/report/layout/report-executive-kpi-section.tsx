"use client";

import { useMemo } from "react";
import { ReportUnifiedKpiGrid } from "@/components/report/report-unified-kpi-grid";
import { reportSectionGroupDescClass, reportSubsectionTitleClass } from "@/components/report/report-ui-tokens";
import {
  EXECUTIVE_PRIMARY_KPI_IDS,
  EXECUTIVE_SECONDARY_KPI_IDS,
} from "@/lib/report/kpi-display-clusters";
import type { UnifiedKpiDisplayItem } from "@/lib/report/kpi-performance/merge-unified-kpi-display";

function pickByOrder(items: readonly UnifiedKpiDisplayItem[], order: readonly string[]): UnifiedKpiDisplayItem[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const out: UnifiedKpiDisplayItem[] = [];
  for (const id of order) {
    const item = byId.get(id);
    if (item) out.push(item);
  }
  return out;
}

import type { ReportCompareMode } from "@/lib/report/date-ranges";

export function ReportExecutiveKpiSection({
  items,
  compareMode = "none",
}: {
  items: readonly UnifiedKpiDisplayItem[];
  compareMode?: ReportCompareMode;
}) {
  const { primary, secondary } = useMemo(() => {
    return {
      primary: pickByOrder(items, EXECUTIVE_PRIMARY_KPI_IDS),
      secondary: pickByOrder(items, EXECUTIVE_SECONDARY_KPI_IDS),
    };
  }, [items]);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className={reportSectionGroupDescClass}>
          Indicatori chiave per valutare l&apos;andamento dell&apos;officina nel periodo. Le pillole indicano
          l&apos;affidabilità del dato (esatto, stima, proxy).
        </p>
        <div className="mt-3">
          <ReportUnifiedKpiGrid items={primary} variant="hero" compareMode={compareMode} />
        </div>
      </div>

      {secondary.length > 0 ? (
        <section className="min-w-0 space-y-2" aria-labelledby="report-executive-secondary-kpi">
          <h2 id="report-executive-secondary-kpi" className={reportSubsectionTitleClass}>
            Dettaglio operativo
          </h2>
          <ReportUnifiedKpiGrid items={secondary} variant="compact" compareMode={compareMode} />
        </section>
      ) : null}
    </div>
  );
}
