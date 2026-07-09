"use client";

import type { ReactNode } from "react";
import { useReportDensity } from "@/components/report/design-system/internal/use-report-density";
import { useStatusColor } from "@/components/report/design-system/internal/use-semantic-color";
import type { StatusTone } from "@/components/report/design-system/internal/semantic-types";

export type NarrativeVariant = "summary" | "explanation" | "warning" | "ai";

const VARIANT_TONE: Record<NarrativeVariant, StatusTone> = {
  summary: "neutral",
  explanation: "info",
  warning: "warning",
  ai: "info",
};

export function ReportNarrativeBlock({
  variant = "summary",
  title,
  children,
}: {
  variant?: NarrativeVariant;
  title?: string;
  children: ReactNode;
}) {
  const { narrativeGap, chartPadding } = useReportDensity();
  const shell = useStatusColor(VARIANT_TONE[variant]);
  return (
    <article className={`min-w-0 rounded-[var(--ds-radius-xl)] border ${chartPadding} ${shell} flex flex-col ${narrativeGap}`}>
      {title ? <h4 className="text-sm font-semibold text-[color:var(--cab-text)]">{title}</h4> : null}
      <div className="text-sm leading-relaxed text-[color:var(--cab-text)]">{children}</div>
    </article>
  );
}
