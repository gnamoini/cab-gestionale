"use client";

import type { ReactNode } from "react";
import { ReportStorySection } from "@/components/report/design-system/layout/story-section";

/** Flat section wrapper — no collapsible. */
export function ReportSection({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  defaultCollapsed?: boolean;
  children: ReactNode;
}) {
  return (
    <ReportStorySection title={title} subtitle={subtitle} testId={`report-story-${id}`}>
      {children}
    </ReportStorySection>
  );
}
