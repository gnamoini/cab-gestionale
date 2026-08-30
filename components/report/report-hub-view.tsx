"use client";

import dynamic from "next/dynamic";
import { reportHubAreasSorted } from "@/lib/report/report-hub-areas-config";
import { ReportHubCard } from "@/components/report/report-hub-card";
import { dsStackPage, dsTypoSmall } from "@/lib/ui/design-system";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { useReportPdfWarmup } from "@/lib/observability/use-deferred-pdf-warmup";
import { useGestionaleSyncScope } from "@/src/hooks/gestionale/use-gestionale-sync-scope";
import { reportTypographySectionDescClass, reportTypographySectionTitleClass } from "@/components/report/design-system/typography/report-typography";

const ReportHubMiniDashboard = dynamic(() =>
  import("@/components/report/hub/report-hub-mini-dashboard").then((m) => m.ReportHubMiniDashboard),
);

const hubHeaderClass =
  "relative overflow-hidden rounded-[var(--ds-radius-xl)] border border-[color:color-mix(in_srgb,var(--cab-primary)_20%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_5%,var(--cab-card))] px-4 py-4 shadow-[var(--cab-shadow-sm)] sm:px-5 sm:py-5";

export function ReportHubView() {
  useGestionaleSyncScope({
    scopeId: "report-hub-view",
    domain: "report",
    route: "/report",
    tables: [],
  });
  useReportPdfWarmup();
  const areas = reportHubAreasSorted();

  return (
    <div className={`${dsStackPage} ${layoutPageRoot} min-w-0 max-w-full`} data-testid="report-hub">
      <header className={hubHeaderClass}>
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] text-[color:var(--cab-primary)]"
            aria-hidden
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 17V9m4 8V7m4 10v-6" />
            </svg>
          </span>
          <div className="min-w-0 space-y-1.5">
            <h2 className="text-lg font-semibold tracking-tight text-[color:var(--cab-text)]">Centro analisi</h2>
            <p className={`${dsTypoSmall} max-w-3xl leading-relaxed`}>
              Una fotografia del periodo. Sotto, scegli un&apos;area per il dettaglio.
            </p>
          </div>
        </div>
      </header>

      <ReportHubMiniDashboard />

      <section className="min-w-0 space-y-3" aria-labelledby="report-hub-areas-title">
        <div>
          <h3 id="report-hub-areas-title" className={reportTypographySectionTitleClass}>
            Approfondisci per area
          </h3>
          <p className={reportTypographySectionDescClass}>Scegli un ambito per entrare nel dettaglio.</p>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {areas.map((area) => (
            <ReportHubCard key={area.id} area={area} />
          ))}
        </div>
      </section>
    </div>
  );
}
