import type { ReactNode } from "react";
import { SkeletonBlock } from "@/components/design-system/loading/skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "@/components/design-system/loading/skeleton-layout-presets";
import { reportStoryDividerClass } from "@/lib/report/ui/report-analytics-tokens";
import {
  reportCommandBarClass,
  reportCommandFiltersBodyClass,
  reportCommandFiltersShellClass,
  reportToolbarMetaRowClass,
} from "@/components/report/report-ui-tokens";

import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";

export type ReportSkeletonVariant = "hub" | "area";

const HUB_CARD_COUNT = 11;

const hubHeaderShellClass =
  "min-h-[5.5rem] rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)]";

function ReportStoryHeaderSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      <SkeletonBlock minHeightClass="h-5" className="w-2/3 max-w-sm" />
      <SkeletonBlock minHeightClass="h-4" className="w-1/2 max-w-xs" />
    </div>
  );
}

function ReportStorySectionSkeleton({
  children,
  showDivider = true,
}: {
  children: ReactNode;
  showDivider?: boolean;
}) {
  return (
    <section
      className={`min-w-0 ${showDivider ? reportStoryDividerClass : ""} first:border-t-0 first:pt-0`}
      aria-hidden
    >
      <ReportStoryHeaderSkeleton />
      <div className="mt-4 min-w-0 space-y-4">{children}</div>
    </section>
  );
}

function ReportKpiStripSkeleton() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonBlock key={i} minHeightClass="min-h-[8.5rem]" className="w-full" />
      ))}
    </div>
  );
}

function ReportChartBlockSkeleton({ minHeightClass = SKELETON_MIN_HEIGHT.chart }: { minHeightClass?: string }) {
  return <SkeletonBlock minHeightClass={minHeightClass} className="w-full" />;
}

function ReportMainAsideSkeleton() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-7">
        <ReportChartBlockSkeleton minHeightClass="min-h-[16rem]" />
      </div>
      <div className="min-w-0 lg:col-span-5">
        <ReportChartBlockSkeleton minHeightClass="min-h-[12rem]" />
      </div>
    </div>
  );
}

function ReportSplitChartsSkeleton() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
      <ReportChartBlockSkeleton />
      <ReportChartBlockSkeleton />
    </div>
  );
}

function ReportTableBlockSkeleton() {
  return <SkeletonBlock minHeightClass={SKELETON_MIN_HEIGHT.tableCompact} className="w-full" />;
}

/** Corpo area analitica — story sections, KPI strip, grafici, tabella. */
export function ReportAreaContentSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-8 ${className}`.trim()}
      data-testid="report-area-content-skeleton"
      aria-hidden
    >
      <ReportStorySectionSkeleton showDivider={false}>
        <ReportKpiStripSkeleton />
        <ReportMainAsideSkeleton />
      </ReportStorySectionSkeleton>
      <ReportStorySectionSkeleton>
        <ReportSplitChartsSkeleton />
      </ReportStorySectionSkeleton>
      <ReportStorySectionSkeleton>
        <ReportTableBlockSkeleton />
      </ReportStorySectionSkeleton>
    </div>
  );
}

function ReportToolbarSkeleton() {
  return (
    <div className={reportCommandBarClass} data-testid="report-v2-skeleton-command-bar">
      <div className={reportCommandFiltersShellClass}>
        <div className={reportToolbarMetaRowClass}>
          <SkeletonBlock minHeightClass="h-6" className="w-full max-w-md" />
        </div>
        <div className={reportCommandFiltersBodyClass}>
          <SkeletonBlock minHeightClass="min-h-[11rem]" className="w-full" />
        </div>
      </div>
    </div>
  );
}

/** Hub /report — header + griglia card aree (4 colonne desktop). */
export function ReportHubRouteSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-4 ${className}`.trim()}
      role="status"
      aria-label="Caricamento centro analisi"
      data-testid="report-hub-route-skeleton"
      data-skeleton-variant="hub"
    >
      <SkeletonBlock minHeightClass={hubHeaderShellClass} className="w-full" />
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: HUB_CARD_COUNT }).map((_, i) => (
          <SkeletonBlock key={i} minHeightClass="min-h-[9.5rem]" className="w-full" />
        ))}
      </div>
    </div>
  );
}

/** Skeleton Report — parity toolbar narrativo + sezioni analitiche. RSC-safe. */
export function ReportV2RouteSkeleton({
  scope = "full",
  variant = "area",
  className = "",
}: {
  scope?: RouteSkeletonScope;
  variant?: ReportSkeletonVariant;
  className?: string;
}) {
  if (variant === "hub") {
    return <ReportHubRouteSkeleton className={className} />;
  }

  return (
    <div
      className={`flex min-w-0 flex-col gap-4 ${className}`.trim()}
      role="status"
      aria-label="Caricamento report"
      data-testid="report-v2-route-skeleton"
      data-skeleton-scope={scope}
      data-skeleton-variant={variant}
    >
      {scope === "full" ? <ReportToolbarSkeleton /> : null}
      <ReportAreaContentSkeleton />
    </div>
  );
}
