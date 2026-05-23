"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/design-system";
import { DashboardTasksPanel } from "@/components/dashboard/dashboard-tasks-panel";
import {
  dsFocus,
  dsSurfaceInteractiveKpi,
  dsSurfacePanel,
  dsTypoCaption,
  dsTypoSmall,
} from "@/lib/ui/design-system";
import { formatTitleCasePhrase } from "@/lib/gestionale-log/view-model";
import {
  prioritaLabel,
  statoPillShellClassDynamic,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { lavTablePillTextClass } from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { prioritaDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import {
  formatDashboardLavWidgetSubtitle,
  formatDashboardMagRicambioIdent,
} from "@/lib/view/dashboard-widgets-selectors";
import { useDashboardMetrics } from "@/src/hooks/view/use-dashboard-metrics";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { statoLavorazioneLabel } from "@/src/shared/selectors";
import type { PrioritaLav } from "@/lib/lavorazioni/types";

const kpiCardClass = `${dsSurfaceInteractiveKpi} ${dsFocus}`;
const panelCardClass = `${dsSurfacePanel} flex min-h-[220px] flex-col p-4`;

const kpiCardBadgeClass =
  "rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:color-mix(in_srgb,var(--cab-primary)_95%,var(--cab-text))]";

const widgetTitleClass = `${dsTypoSmall} font-bold uppercase tracking-wide text-[color:var(--cab-primary)]`;

function formatEur(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function WidgetLoading() {
  return <p className={dsTypoCaption}>Caricamento…</p>;
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
      <p className={dsTypoCaption}>{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-[color:var(--cab-text)]">{value}</p>
    </div>
  );
}

function StatoMiniPill({ stato, statiOpts }: { stato: string; statiOpts: { id: string; label: string; color?: string }[] }) {
  const label = statoLavorazioneLabel(stato, statiOpts) || stato;
  return (
    <span
      className={`${statoPillShellClassDynamic()} inline-flex max-w-[5.5rem] shrink-0 justify-center px-1.5 py-0.5 ${lavTablePillTextClass} text-[10px] whitespace-nowrap`}
      style={readablePillStyleFromHex(statoDisplayColor(stato, statiOpts))}
    >
      {label}
    </span>
  );
}

function PrioritaMiniPill({
  priorita,
  prioritaColors,
}: {
  priorita: string;
  prioritaColors: Record<string, string | undefined>;
}) {
  const p = priorita as PrioritaLav;
  const hex = p === "urgente" ? "#b91c1c" : prioritaDisplayColor(p, prioritaColors);
  return (
    <span
      className={`${statoPillShellClassDynamic()} inline-flex shrink-0 justify-center px-1.5 py-0.5 ${lavTablePillTextClass} text-[10px] whitespace-nowrap`}
      style={readablePillStyleFromHex(hex)}
    >
      {prioritaLabel(priorita)}
    </span>
  );
}

function DashboardLavorazioniWidget({
  loading,
  error,
  rows,
  statiOpts,
  prioritaColors,
}: {
  loading: boolean;
  error: boolean;
  rows: ReturnType<typeof useDashboardMetrics>["lavRows"];
  statiOpts: { id: string; label: string; color?: string }[];
  prioritaColors: Record<string, string | undefined>;
}) {
  return (
    <Link href="/lavorazioni" className={kpiCardClass} aria-label="Apri lavorazioni">
      <div className="flex items-start justify-between gap-2">
        <h2 className={widgetTitleClass}>Lavorazioni</h2>
        <span className={kpiCardBadgeClass}>Operativo</span>
      </div>
      <ul className="mt-4 flex-1 space-y-2.5">
        {loading ? (
          <li>
            <WidgetLoading />
          </li>
        ) : error ? (
          <li>
            <WidgetError />
          </li>
        ) : rows.length === 0 ? (
          <li>
            <WidgetEmpty message="Nessuna lavorazione attiva." />
          </li>
        ) : (
          rows.map((row) => {
            const subtitle = formatDashboardLavWidgetSubtitle(row.cliente, row.ident);
            return (
              <li key={row.id} className="flex min-w-0 items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[color:var(--cab-text)]">
                    {formatTitleCasePhrase(row.macchina)}
                  </p>
                  {subtitle ? <p className={`${dsTypoCaption} truncate`}>{subtitle}</p> : null}
                  <p className={dsTypoCaption}>{formatShortDate(row.updatedAt)}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 pt-0.5">
                  {row.isUrgent ? (
                    <PrioritaMiniPill priorita={row.priorita} prioritaColors={prioritaColors} />
                  ) : null}
                  <StatoMiniPill stato={row.stato} statiOpts={statiOpts} />
                </span>
              </li>
            );
          })
        )}
      </ul>
    </Link>
  );
}

function DashboardMagazzinoWidget({
  staging,
  loading,
  error,
  stats,
  daily,
  recentRicambi,
  recentMovements,
}: {
  staging: boolean;
  loading: boolean;
  error: boolean;
  stats: ReturnType<typeof useDashboardMetrics>["magStats"];
  daily: ReturnType<typeof useDashboardMetrics>["magDailyMovements"];
  recentRicambi: ReturnType<typeof useDashboardMetrics>["magRecentRicambi"];
  recentMovements: ReturnType<typeof useDashboardMetrics>["magRecentMovements"];
}) {
  const capitaleLabel = useMemo(() => formatEur(stats.capitale), [stats.capitale]);

  return (
    <Link href="/magazzino" className={kpiCardClass} aria-label="Apri magazzino">
      <div className="flex items-start justify-between gap-2">
        <h2 className={widgetTitleClass}>Magazzino</h2>
        <span className={kpiCardBadgeClass}>Stock</span>
      </div>
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
          <div className="mt-4 grid grid-cols-2 gap-3">
            <KpiStat label="Capitale immobilizzato" value={capitaleLabel} />
            <KpiStat label="Sotto scorta" value={String(stats.sottoScorta)} />
            <KpiStat label="Entrate oggi" value={String(daily.entrate)} />
            <KpiStat label="Uscite oggi" value={String(daily.uscite)} />
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <p className={`${dsTypoCaption} mb-0.5 font-semibold uppercase tracking-wide`}>Ultimi modificati</p>
              <p className={`${dsTypoCaption} mb-1.5`}>Anagrafica ricambio aggiornata di recente</p>
              {recentRicambi.length === 0 ? (
                <WidgetEmpty message="Nessun ricambio." />
              ) : (
                <ul className="space-y-2">
                  {recentRicambi.map((r) => {
                    const ident = formatDashboardMagRicambioIdent(r.marca, r.codice);
                    return (
                      <li key={r.id} className="flex min-w-0 items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[color:var(--cab-text)]">{r.label}</p>
                          {ident ? <p className={`${dsTypoCaption} truncate`}>{ident}</p> : null}
                          <p className={dsTypoCaption}>{formatShortDate(r.updatedAt)}</p>
                        </div>
                        {r.sottoScorta ? <Badge tone="warn">Sotto</Badge> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div>
              <p className={`${dsTypoCaption} mb-0.5 font-semibold uppercase tracking-wide`}>Ultimi movimenti</p>
              <p className={`${dsTypoCaption} mb-1.5`}>Entrate e uscite di stock registrate</p>
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
          </div>
        </>
      )}
    </Link>
  );
}

function DashboardLocalNotesWidget() {
  return (
    <div className={panelCardClass}>
      <div className="flex items-start justify-between gap-2">
        <h2 className={widgetTitleClass}>Note</h2>
        <span className={kpiCardBadgeClass}>Appunti</span>
      </div>
      <p className={`${dsTypoCaption} mt-1`}>Promemoria locali di questa pagina, non collegati al modulo Supporto.</p>
      <div className="mt-3 min-h-0 flex-1">
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
    magStats,
    magRecentRicambi,
    magDailyMovements,
    magRecentMovements,
    lavLoading,
    lavError,
    magLoading,
    magError,
  } = useDashboardMetrics();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DashboardLavorazioniWidget
        loading={lavLoading}
        error={lavError}
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
        recentRicambi={magRecentRicambi}
        recentMovements={magRecentMovements}
      />
      <DashboardLocalNotesWidget />
    </div>
  );
}
