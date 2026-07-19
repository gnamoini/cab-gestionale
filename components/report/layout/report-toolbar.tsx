"use client";

import { Tooltip } from "@/components/ui";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/gestionale/page-header";
import { PageActionMenu, type PageActionItem } from "@/components/ui";

import { ReportControls } from "@/components/report/report-controls";

import { reportCommandBarClass, reportCommandFiltersShellClass } from "@/components/report/report-ui-tokens";

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

  compareCustomFrom,

  compareCustomTo,

  onCompareCustomFrom,

  onCompareCustomTo,

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

  compareCustomFrom: string;

  compareCustomTo: string;

  onCompareCustomFrom: (s: string) => void;

  onCompareCustomTo: (s: string) => void;

  range: DateRange;

  compareRange: DateRange | null;

}) {

  return (

    <div className={reportCommandBarClass} data-testid="page-ready-toolbar">

      <PageHeader

        title="Report"

        titleAddon={titleAddon}

        actions={
          <PageActionMenu
            items={[
              {
                id: "export-pdf",
                label: "Esporta PDF",
                description: "Esporta il report gestionale in PDF",
                onSelect: () => void openPdfArtifact("report-bundle"),
              },
            ]}
          />
        }

      />

      <div className={`min-w-0 ${reportCommandFiltersShellClass} p-3 sm:p-4`}>

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

  );

}

