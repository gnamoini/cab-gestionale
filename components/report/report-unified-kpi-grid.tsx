"use client";

import { useMemo } from "react";
import { ReportMetricRenderer } from "@/components/report/report-metric-renderer";
import { fromUnifiedKpiItems } from "@/lib/report/adapters/from-unified-kpi";
import { getMetricDefinition } from "@/lib/report/metrics/get-metric-definition";
import type { UnifiedKpiDisplayItem } from "@/lib/report/kpi-performance/merge-unified-kpi-display";

export function ReportUnifiedKpiGrid({
  items,
  variant = "default",
  compareMode = "none",
}: {
  items: UnifiedKpiDisplayItem[];
  variant?: "default" | "hero" | "compact";
  compareMode?: import("@/lib/report/date-ranges").ReportCompareMode;
}) {
  const metrics = useMemo(() => fromUnifiedKpiItems(items, compareMode), [items, compareMode]);
  const gridClass =
    variant === "hero"
      ? "grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      : variant === "compact"
        ? "grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3"
        : "grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  if (metrics.length === 0) return null;

  return (
    <div className={gridClass}>
      {metrics.map((m) => (
        <div key={m.id} className="min-w-0">
          <ReportMetricRenderer
            metric={m}
            definition={getMetricDefinition(m.id)}
            hero={variant === "hero"}
            compact={variant === "compact"}
          />
        </div>
      ))}
    </div>
  );
}
