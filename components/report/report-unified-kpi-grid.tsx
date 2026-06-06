"use client";

import { ReportKpiCard } from "@/components/report/report-kpi-card";
import { trustForKpiId } from "@/lib/report/kpi-display-clusters";
import type { UnifiedKpiDisplayItem } from "@/lib/report/kpi-performance/merge-unified-kpi-display";

export function ReportUnifiedKpiGrid({
  items,
  variant = "default",
}: {
  items: UnifiedKpiDisplayItem[];
  variant?: "default" | "hero" | "compact";
}) {
  const gridClass =
    variant === "hero"
      ? "grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      : variant === "compact"
        ? "grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3"
        : "grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className={gridClass}>
      {items.map((k) => (
        <div
          key={k.id}
          className={`min-w-0 ${k.hero && variant === "default" ? "sm:col-span-2 lg:col-span-2" : ""}`}
        >
          <ReportKpiCard
            label={k.label}
            value={k.value}
            description={k.description}
            sub={k.sub}
            compareRows={k.compareRows}
            spark={k.spark}
            hero={variant === "hero" || k.hero}
            compact={variant === "compact" || k.compact}
            trust={trustForKpiId(k.id)}
          />
        </div>
      ))}
    </div>
  );
}
