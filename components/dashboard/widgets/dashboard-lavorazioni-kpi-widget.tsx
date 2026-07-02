"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LoadingCardSkeleton } from "@/components/design-system";
import { lavTablePillTextClass } from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import { formatTitleCasePhrase } from "@/lib/gestionale-log/view-model";
import { prioritaLabel, statoPillShellClass } from "@/lib/lavorazioni/lavorazioni-pill-styles";
import type { PrioritaLav } from "@/lib/lavorazioni/types";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import {
  dsDashboardWidgetTitle,
  dsFocus,
  dsSurfaceInteractiveKpi,
  dsTypoCaption,
} from "@/lib/ui/design-system";
import { useDashboardMetrics } from "@/src/hooks/view/use-dashboard-metrics";
import { statoLavorazioneLabel } from "@/src/shared/selectors";

const kpiCardClass = `${dsSurfaceInteractiveKpi} min-w-0 max-w-full overflow-hidden ${dsFocus}`;
const widgetTitleClass = dsDashboardWidgetTitle;
const dashboardLavMiniPillColClass =
  "flex w-max max-w-[min(11.5rem,48%)] shrink-0 flex-col items-stretch justify-between gap-1.5 self-stretch py-0.5";
const dashboardLavMiniPillShellClass = `${statoPillShellClass()} min-h-[1.375rem] w-full justify-center px-2 py-0.5 text-[10px]`;
const dashboardLavMiniPillTextClass = `block whitespace-nowrap text-center ${lavTablePillTextClass}`;
const dashboardLavRowMetaClass =
  "mt-0.5 truncate text-[11px] font-normal leading-snug text-inherit opacity-95";

function WidgetLoading() {
  return <LoadingCardSkeleton minHeightClass="min-h-[220px]" rows={3} />;
}

function WidgetError() {
  return <p className={`${dsTypoCaption} text-[color:var(--cab-danger)]`}>Dati non disponibili.</p>;
}

function WidgetEmpty({ message }: { message: string }) {
  return <p className={dsTypoCaption}>{message}</p>;
}

function KpiStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className={`${dsTypoCaption} truncate`}>{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-[color:var(--cab-text)]">{value}</p>
    </div>
  );
}

function dashboardLavPrioritaHex(priorita: string, prioritaColors: Record<string, string | undefined>): string {
  const p = priorita as PrioritaLav;
  return p === "urgente" ? "#b91c1c" : prioritaDisplayColor(p, prioritaColors);
}

function DashboardLavRowPill({
  priorita,
  prioritaColors,
  children,
}: {
  priorita: string;
  prioritaColors: Record<string, string | undefined>;
  children: ReactNode;
}) {
  return (
    <div
      className="flex min-w-0 items-stretch gap-2 rounded-lg border px-2.5 py-2 shadow-sm shadow-black/10 transition-[filter,box-shadow] duration-200 ease-out dark:shadow-black/25"
      style={readablePillStyleFromHex(dashboardLavPrioritaHex(priorita, prioritaColors))}
    >
      {children}
    </div>
  );
}

function PrioritaMiniPill({ priorita }: { priorita: string }) {
  const label = prioritaLabel(priorita);
  return (
    <span
      className={`${dashboardLavMiniPillShellClass} border-current/30 bg-black/15 backdrop-blur-[1px]`}
      title={label}
    >
      <span className={dashboardLavMiniPillTextClass}>{label}</span>
    </span>
  );
}

function StatoMiniPill({ stato, statiOpts }: { stato: string; statiOpts: { id: string; label: string; color?: string }[] }) {
  const label = statoLavorazioneLabel(stato, statiOpts) || stato;
  return (
    <span
      className={dashboardLavMiniPillShellClass}
      style={readablePillStyleFromHex(statoDisplayColor(stato, statiOpts))}
      title={label}
    >
      <span className={dashboardLavMiniPillTextClass}>{label}</span>
    </span>
  );
}

export function DashboardLavorazioniKpiWidget() {
  const { globalOpts, lavRows, lavStats, lavLoading, lavError } = useDashboardMetrics();

  return (
    <Link href="/lavorazioni" className={kpiCardClass} aria-label="Apri lavorazioni">
      <h2 className={`${widgetTitleClass} min-w-0 truncate`}>Lavorazioni</h2>
      {lavLoading ? (
        <div className="mt-4">
          <WidgetLoading />
        </div>
      ) : lavError ? (
        <div className="mt-4">
          <WidgetError />
        </div>
      ) : (
        <>
          <div className="mt-4 grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
            <KpiStat label="In corso" value={String(lavStats.inCorso)} />
            <KpiStat label="Urgenti" value={String(lavStats.urgenti)} />
            <KpiStat label="Entrati oggi" value={String(lavStats.entratiOggi)} />
          </div>
          <ul className="mt-4 min-w-0 flex-1 space-y-2.5">
            {lavRows.length === 0 ? (
              <li>
                <WidgetEmpty message="Nessuna lavorazione attiva." />
              </li>
            ) : (
              lavRows.map((row) => {
                const subtitle = row.mezzoIdent;
                return (
                  <li key={row.id}>
                    <DashboardLavRowPill priorita={row.priorita} prioritaColors={globalOpts.lavorazioni.prioritaColors}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-snug text-inherit">
                          {formatTitleCasePhrase(row.macchina)}
                        </p>
                        {subtitle ? <p className={dashboardLavRowMetaClass}>{subtitle}</p> : null}
                        {row.addetto ? <p className={dashboardLavRowMetaClass}>{row.addetto}</p> : null}
                      </div>
                      <span className={dashboardLavMiniPillColClass}>
                        <PrioritaMiniPill priorita={row.priorita} />
                        <StatoMiniPill stato={row.stato} statiOpts={globalOpts.lavorazioni.stati} />
                      </span>
                    </DashboardLavRowPill>
                  </li>
                );
              })
            )}
          </ul>
        </>
      )}
    </Link>
  );
}
