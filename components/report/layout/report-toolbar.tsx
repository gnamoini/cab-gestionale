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
import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";
import { dsPageToolbarBtn } from "@/lib/ui/design-system";

function IconPrint({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

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
      <PageHeader
        title="Report"
        titleAddon={titleAddon}
        actions={
          <button
            type="button"
            className={dsPageToolbarBtn}
            onClick={() => void openPdfArtifact("report-bundle")}
            title="Esporta PDF report gestionale"
            aria-label="Esporta PDF report gestionale"
          >
            <IconPrint />
            Esporta PDF
          </button>
        }
      />
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
