"use client";

import type { ReactNode } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { ToolbarGroup, ToolbarGroupBody } from "@/components/design-system/toolbar-group";
import { ReportControls } from "@/components/report/report-controls";
import { ReportZoneNav } from "@/components/report/layout/report-zone-nav";
import { ReportPeriodMeta } from "@/components/report/report-period-summary";
import {
  reportCommandBarClass,
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
        <div className="border-b border-[color:var(--cab-border)] px-3 py-2">
          <ReportPeriodMeta
            preset={preset}
            range={range}
            compareMode={compareMode}
            compareRange={compareRange}
          />
        </div>
        <ReportZoneNav />
        <ToolbarGroup className="border-0 shadow-none px-3 pb-3 pt-2">
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
            />
          </ToolbarGroupBody>
        </ToolbarGroup>
      </div>
    </div>
  );
}
