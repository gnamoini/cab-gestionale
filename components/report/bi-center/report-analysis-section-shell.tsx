"use client";

import { ReportStorySection } from "@/components/report/design-system/layout/story-section";
import type { ReactNode } from "react";

/**
 * @deprecated Use ReportStorySection directly. persistKey/defaultCollapsed are ignored (flat narrative).
 */
export function ReportAnalysisSectionShell({
  title,
  subtitle,
  children,
  persistKey,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  persistKey?: string;
  defaultCollapsed?: boolean;
  accordionId?: string;
}) {
  return (
    <ReportStorySection title={title} subtitle={subtitle} testId={persistKey ? `report-story-${persistKey}` : undefined}>
      {children}
    </ReportStorySection>
  );
}
