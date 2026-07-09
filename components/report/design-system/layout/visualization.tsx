"use client";

import type { ReactNode } from "react";
import { useReportDensity } from "@/components/report/design-system/internal/use-report-density";

export function ReportVisualization({ title, children }: { title?: string; children: ReactNode }) {
  const { chartMinHeight, chartPadding } = useReportDensity();
  return (
    <div
      className={`min-w-0 rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)] ${chartMinHeight} ${chartPadding}`}
    >
      {title ? (
        <p className="mb-2 text-sm font-semibold text-[color:var(--cab-text)]">{title}</p>
      ) : null}
      {children}
    </div>
  );
}
