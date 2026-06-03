"use client";

import type { ReactNode } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { ToolbarGroup, ToolbarGroupBody } from "@/components/design-system/toolbar-group";
import { ReportControls } from "@/components/report/report-controls";
import { ReportPeriodMeta } from "@/components/report/report-period-summary";
import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";
import type { DateRange } from "@/lib/report/date-ranges";

export function ReportToolbar({
  titleAddon,
  preset,
  onPreset,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
  compareMode,
  onCompareMode,
  range,
  compareRange,
}: {
  titleAddon: ReactNode;
  preset: ReportPeriodPreset;
  onPreset: (p: ReportPeriodPreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (s: string) => void;
  onCustomTo: (s: string) => void;
  compareMode: ReportCompareMode;
  onCompareMode: (m: ReportCompareMode) => void;
  range: DateRange;
  compareRange: DateRange | null;
}) {
  return (
    <>
      <PageHeader title="Report" titleAddon={titleAddon} />
      <ShellCard>
        <ToolbarGroup className="sm:mx-0">
          <ToolbarGroupBody>
            <ReportControls
              preset={preset}
              onPreset={onPreset}
              customFrom={customFrom}
              customTo={customTo}
              onCustomFrom={onCustomFrom}
              onCustomTo={onCustomTo}
              compareMode={compareMode}
              onCompareMode={onCompareMode}
              periodMeta={
                <ReportPeriodMeta
                  preset={preset}
                  range={range}
                  compareMode={compareMode}
                  compareRange={compareRange}
                />
              }
            />
          </ToolbarGroupBody>
        </ToolbarGroup>
      </ShellCard>
    </>
  );
}
