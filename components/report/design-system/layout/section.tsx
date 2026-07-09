"use client";

import type { ReactNode } from "react";
import { ReportSubsection } from "@/components/report/sections/report-subsection";
import { useReportDensity } from "@/components/report/design-system/internal/use-report-density";

/** Shell sezione report — wrapper su ReportSubsection esistente. */
export function ReportSection({
  id,
  title,
  subtitle,
  defaultCollapsed,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  defaultCollapsed?: boolean;
  children: ReactNode;
}) {
  const { sectionGap } = useReportDensity();
  return (
    <div className={`min-w-0 flex flex-col ${sectionGap}`}>
      <ReportSubsection id={id} title={title} subtitle={subtitle} defaultCollapsed={defaultCollapsed}>
        {children}
      </ReportSubsection>
    </div>
  );
}
