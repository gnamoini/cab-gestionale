"use client";

import type { ReactNode } from "react";
import { reportStoryDividerClass } from "@/lib/report/ui/report-analytics-tokens";
import { ReportSectionHeader } from "@/components/report/design-system/typography/report-typography-components";

/**
 * Narrative unit — one analytical question per section. Never collapsible.
 */
export function ReportStorySection({
  title,
  subtitle,
  children,
  testId,
  showDivider = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  testId?: string;
  showDivider?: boolean;
}) {
  return (
    <section
      className={`min-w-0 ${showDivider ? reportStoryDividerClass : ""} first:border-t-0 first:pt-0`}
      data-testid={testId}
    >
      <ReportSectionHeader title={title} subtitle={subtitle} />
      <div className="mt-4 min-w-0 space-y-4">{children}</div>
    </section>
  );
}
