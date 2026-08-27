"use client";

import type { ReactNode } from "react";

import { PageHeaderPageActionMenu } from "@/components/gestionale/page-header-actions-portal";

import { ReportAskToolbarButton } from "@/components/report/ask-report/report-ask-toolbar-button";
import { ReportControls } from "@/components/report/report-controls";

import {
  reportCommandBarClass,
  reportCommandFiltersBodyClass,
  reportCommandFiltersShellClass,
  reportToolbarAreaLabelClass,
  reportToolbarMetaRowClass,
  reportToolbarMetaStartClass,
} from "@/components/report/report-ui-tokens";

import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";

import type { DateRange } from "@/lib/report/date-ranges";

import { openPdfArtifactFromUserClick } from "@/lib/pdf/request-pdf-artifact";

import { getReportHubArea, type ReportHubAreaId } from "@/lib/report/report-hub-areas-config";

export function ReportToolbar({
  areaId,
  integrityBadge,
  showAskButton = false,
  titleAddon,
  preset,
  onPreset,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
  compareMode,
  onCompareMode,
  compareCustomFrom,
  compareCustomTo,
  onCompareCustomFrom,
  onCompareCustomTo,
  range,
  compareRange,
}: {
  areaId?: ReportHubAreaId;
  integrityBadge?: ReactNode;
  showAskButton?: boolean;
  /** @deprecated Usare integrityBadge + showAskButton */
  titleAddon?: ReactNode;
  preset: ReportPeriodPreset;
  onPreset: (p: ReportPeriodPreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (s: string) => void;
  onCustomTo: (s: string) => void;
  compareMode: ReportCompareMode;
  onCompareMode: (m: ReportCompareMode) => void;
  compareCustomFrom: string;
  compareCustomTo: string;
  onCompareCustomFrom: (s: string) => void;
  onCompareCustomTo: (s: string) => void;
  range: DateRange;
  compareRange: DateRange | null;
}) {
  const areaLabel = areaId ? getReportHubArea(areaId)?.label : undefined;
  const metaStart = titleAddon ?? (
    <>
      {integrityBadge}
      {showAskButton ? <ReportAskToolbarButton /> : null}
    </>
  );
  const showMetaRow = Boolean(areaLabel || metaStart);

  return (
    <div className={reportCommandBarClass} data-testid="page-ready-toolbar">
      <PageHeaderPageActionMenu
        items={[
          {
            id: "export-pdf",
            label: "Esporta PDF",
            description: "Esporta il report gestionale in PDF",
            onSelect: () => openPdfArtifactFromUserClick("report-bundle", undefined, { context: "report" }),
          },
        ]}
      />
      <div className={reportCommandFiltersShellClass}>
        {showMetaRow ? (
          <div className={reportToolbarMetaRowClass}>
            <div className={reportToolbarMetaStartClass}>
              {areaLabel ? <span className={reportToolbarAreaLabelClass}>{areaLabel}</span> : null}
              {areaLabel && metaStart ? (
                <span className="hidden h-4 w-px bg-[color:var(--cab-border)] sm:inline-block" aria-hidden />
              ) : null}
              {metaStart}
            </div>
          </div>
        ) : null}
        <div className={reportCommandFiltersBodyClass}>
          <ReportControls
            preset={preset}
            onPreset={onPreset}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFrom={onCustomFrom}
            onCustomTo={onCustomTo}
            compareMode={compareMode}
            onCompareMode={onCompareMode}
            compareCustomFrom={compareCustomFrom}
            compareCustomTo={compareCustomTo}
            onCompareCustomFrom={onCompareCustomFrom}
            onCompareCustomTo={onCompareCustomTo}
            range={range}
            compareRange={compareRange}
          />
        </div>
      </div>
    </div>
  );
}
