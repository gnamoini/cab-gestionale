"use client";

import { ReportKpiCard } from "@/components/report/report-kpi-card";
import { trustForKpiId } from "@/lib/report/kpi-display-clusters";
import type { UnifiedKpiDisplayItem } from "@/lib/report/kpi-performance/merge-unified-kpi-display";

export function ReportUnifiedKpiGrid({ items }: { items: UnifiedKpiDisplayItem[] }) {
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((k) => (
        <div
          key={k.id}
          className={`min-w-0 ${k.hero ? "sm:col-span-2 lg:col-span-2" : ""} ${k.compact ? "" : ""}`}
        >
          <ReportKpiCard
            label={k.label}
            value={k.value}
            description={k.description}
            sub={k.sub}
            compareRows={k.compareRows}
            spark={k.spark}
            hero={k.hero}
            compact={k.compact}
            trust={trustForKpiId(k.id)}
          />
        </div>
      ))}
    </div>
  );
}
