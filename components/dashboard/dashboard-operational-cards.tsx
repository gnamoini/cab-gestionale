"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, LoadingCardSkeleton } from "@/components/design-system";
import { DashboardTasksPanel } from "@/components/dashboard/dashboard-tasks-panel";
import {
  dsDashboardWidgetTitle,
  dsFocus,
  dsSurfaceInteractiveKpi,
  dsSurfacePanel,
  dsTypoCaption,
  dsTypoSmall,
} from "@/lib/ui/design-system";
import { formatTitleCasePhrase } from "@/lib/gestionale-log/view-model";
import { prioritaLabel, statoPillShellClass } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { lavTablePillTextClass } from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { prioritaDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import {
  formatDashboardMagRicambioTitle,
} from "@/lib/view/dashboard-widgets-selectors";
import { useDashboardMetrics } from "@/src/hooks/view/use-dashboard-metrics";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { statoLavorazioneLabel } from "@/src/shared/selectors";
import type { PrioritaLav } from "@/lib/lavorazioni/types";

const kpiCardClass = `${dsSurfaceInteractiveKpi} min-w-0 max-w-full overflow-hidden ${dsFocus}`;
const panelCardClass = `${dsSurfacePanel} flex min-h-[220px] min-w-0 max-w-full flex-col p-4`;

const widgetTitleClass = dsDashboardWidgetTitle;

const magSottoScortaPillHex = "#b91c1c";

/** Colonna pill priorità/stato: larghezza al contenuto (etichette lunghe es. «Attesa Ricambi»). */
const dashboardLavMiniPillColClass =
  "flex w-max max-w-[min(11.5rem,48%)] shrink-0 flex-col items-stretch justify-between gap-1.5 self-stretch py-0.5";
const dashboardLavMiniPillShellClass = `${statoPillShellClass()} min-h-[1.375rem] w-full justify-center px-2 py-0.5 text-[10px]`;
const dashboardLavMiniPillTextClass = `block whitespace-nowrap text-center ${lavTablePillTextClass}`;

/** Righe secondarie pill lavorazioni dashboard — ereditano contrasto dal colore priorità. */
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

function dashboardLavPrioritaHex(
  priorita: string,
  prioritaColors: Record<string, string | undefined>,
): string {
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
    <span className={dashboardLavMiniPillShellClass} style={readablePillStyleFromHex(statoDisplayColor(stato, statiOpts))} title={label}>
      <span className={dashboardLavMiniPillTextClass}>{label}</span>
    </span>
  );
}

function DashboardLavorazioniWidget({
  loading,
  error,
  stats,
  rows,
  statiOpts,
  prioritaColors,
}: {
  loading: boolean;
  error: boolean;
  stats: ReturnType<typeof useDashboardMetrics>["lavStats"];
  rows: ReturnType<typeof useDashboardMetrics>["lavRows"];
  statiOpts: { id: string; label: string; color?: string }[];
  prioritaColors: Record<string, string | undefined>;
}) {
  return (
    <Link href="/lavorazioni" className={kpiCardClass} aria-label="Apri lavorazioni">
      <h2 className={`${widgetTitleClass} min-w-0 truncate`}>Lavorazioni</h2>
      {loading ? (
        <div className="mt-4">
          <WidgetLoading />
        </div>
      ) : error ? (
        <div className="mt-4">
          <WidgetError />
        </div>
      ) : (
        <>
          <div className="mt-4 grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
            <KpiStat label="In corso" value={String(stats.inCorso)} />
            <KpiStat label="Urgenti" value={String(stats.urgenti)} />
            <KpiStat label="Entrati oggi" value={String(stats.entratiOggi)} />
          </div>
          <ul className="mt-4 min-w-0 flex-1 space-y-2.5">
            {rows.length === 0 ? (
              <li>
                <WidgetEmpty message="Nessuna lavorazione attiva." />
              </li>
            ) : (
              rows.map((row) => {
            const subtitle = row.mezzoIdent;
            return (
              <li key={row.id}>
                <DashboardLavRowPill priorita={row.priorita} prioritaColors={prioritaColors}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-snug text-inherit">
                      {formatTitleCasePhrase(row.macchina)}
                    </p>
                    {subtitle ? <p className={dashboardLavRowMetaClass}>{subtitle}</p> : null}
                    {row.addetto ? <p className={dashboardLavRowMetaClass}>{row.addetto}</p> : null}
                  </div>
                  <span className={dashboardLavMiniPillColClass}>
                    <PrioritaMiniPill priorita={row.priorita} />
                    <StatoMiniPill stato={row.stato} statiOpts={statiOpts} />
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

type MagazzinoRicambioRow = ReturnType<typeof useDashboardMetrics>["magRecentRicambi"][number];

function MagazzinoSottoScortaListItem({ r }: { r: MagazzinoRicambioRow }) {
  return (
    <li>
      <div
        className="flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 shadow-sm shadow-black/10 transition-[filter,box-shadow] duration-200 ease-out dark:shadow-black/25"
        style={readablePillStyleFromHex(magSottoScortaPillHex)}
      >
        <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug">
          {formatDashboardMagRicambioTitle(r.marca, r.label)}
        </p>
        <span className="inline-flex shrink-0 rounded-md border border-current/30 bg-black/15 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap backdrop-blur-[1px]">
          Sotto scorta
        </span>
      </div>
    </li>
  );
}

function MagazzinoRicambioListItem({ r }: { r: MagazzinoRicambioRow }) {
  return (
    <li className="flex min-w-0 items-start gap-2">
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-[color:var(--cab-text)]">
        {formatDashboardMagRicambioTitle(r.marca, r.label)}
      </p>
    </li>
  );
}

function DashboardMagazzinoWidget({
  staging,
  loading,
  error,
  stats,
  daily,
  sottoScortaRicambi,
  recentRicambi,
  recentMovements,
}: {
  staging: boolean;
  loading: boolean;
  error: boolean;
  stats: ReturnType<typeof useDashboardMetrics>["magStats"];
  daily: ReturnType<typeof useDashboardMetrics>["magDailyMovements"];
  sottoScortaRicambi: ReturnType<typeof useDashboardMetrics>["magSottoScortaRicambi"];
  recentRicambi: ReturnType<typeof useDashboardMetrics>["magRecentRicambi"];
  recentMovements: ReturnType<typeof useDashboardMetrics>["magRecentMovements"];
}) {
  return (
    <Link href="/magazzino" className={kpiCardClass} aria-label="Apri magazzino">
      <h2 className={`${widgetTitleClass} min-w-0 truncate`}>Magazzino</h2>
      {staging ? (
        <p className={`${dsTypoCaption} mt-4`}>Anteprima disabilitata in staging pubblico.</p>
      ) : loading ? (
        <div className="mt-4">
          <WidgetLoading />
        </div>
      ) : error ? (
        <div className="mt-4">
          <WidgetError />
        </div>
      ) : (
        <>
          <div className="mt-4 grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
            <KpiStat label="Sotto scorta" value={String(stats.sottoScorta)} />
            <KpiStat label="Entrate oggi" value={String(daily.entrate)} />
            <KpiStat label="Uscite oggi" value={String(daily.uscite)} />
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <p className={`${dsTypoCaption} mb-0.5 font-semibold uppercase tracking-wide`}>Sotto scorta</p>
              {sottoScortaRicambi.length === 0 ? (
                <WidgetEmpty message="Nessun ricambio sotto scorta." />
              ) : (
                <ul className="space-y-2">
                  {sottoScortaRicambi.map((r) => (
                    <MagazzinoSottoScortaListItem key={r.id} r={r} />
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className={`${dsTypoCaption} mb-1.5 font-semibold uppercase tracking-wide`}>Ultimi movimenti</p>
              {recentMovements.length === 0 ? (
                <WidgetEmpty message="Nessun movimento." />
              ) : (
                <ul className="space-y-1.5">
                  {recentMovements.map((m) => (
                    <li key={m.id} className="flex min-w-0 items-center gap-2 text-sm">
                      <Badge tone={m.tipo === "entrata" ? "ok" : "danger"}>{m.tipo === "entrata" ? "Entrata" : "Uscita"}</Badge>
                      <span className="min-w-0 flex-1 truncate text-[color:var(--cab-text)]">{m.label}</span>
                      <span className={`${dsTypoCaption} shrink-0 tabular-nums`}>×{m.quantita}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className={`${dsTypoCaption} mb-1.5 font-semibold uppercase tracking-wide`}>Ultimi modificati</p>
              {recentRicambi.length === 0 ? (
                <WidgetEmpty message="Nessun altro ricambio modificato." />
              ) : (
                <ul className="space-y-2">
                  {recentRicambi.map((r) => (
                    <MagazzinoRicambioListItem key={r.id} r={r} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </Link>
  );
}

function DashboardLocalNotesWidget() {
  return (
    <div className={panelCardClass}>
      <h2 className={`${widgetTitleClass} min-w-0 shrink-0 truncate`}>Note</h2>
      <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col">
        <DashboardTasksPanel />
      </div>
    </div>
  );
}

export function DashboardOperationalCards() {
  const globalOpts = useGlobalOptions({ debugTag: "DashboardOperationalCards" });
  const {
    staging,
    lavRows,
    lavStats,
    magStats,
    magSottoScortaRicambi,
    magRecentRicambi,
    magDailyMovements,
    magRecentMovements,
    lavLoading,
    lavError,
    magLoading,
    magError,
  } = useDashboardMetrics();

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DashboardLavorazioniWidget
        loading={lavLoading}
        error={lavError}
        stats={lavStats}
        rows={lavRows}
        statiOpts={globalOpts.lavorazioni.stati}
        prioritaColors={globalOpts.lavorazioni.prioritaColors}
      />
      <DashboardMagazzinoWidget
        staging={staging}
        loading={magLoading}
        error={magError}
        stats={magStats}
        daily={magDailyMovements}
        sottoScortaRicambi={magSottoScortaRicambi}
        recentRicambi={magRecentRicambi}
        recentMovements={magRecentMovements}
      />
      <DashboardLocalNotesWidget />
    </div>
  );
}
