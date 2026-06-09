"use client";

import type { ReactNode } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { ToolbarGroup, ToolbarGroupBody } from "@/components/design-system/toolbar-group";
import { ReportControls } from "@/components/report/report-controls";
import { ReportPeriodMeta } from "@/components/report/report-period-summary";
import {
  reportCommandBarClass,
  reportCommandFiltersBodyClass,
  reportCommandFiltersShellClass,
} from "@/components/report/report-ui-tokens";
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
    <div className={reportCommandBarClass}>
      <PageHeader title="Report" titleAddon={titleAddon} />
      <div className={reportCommandFiltersShellClass}>
        <ToolbarGroup className={`min-w-0 border-0 shadow-none ${reportCommandFiltersBodyClass}`}>
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
      </div>
    </div>
  );
}
