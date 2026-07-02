"use client";

import Link from "next/link";
import { Badge, LoadingCardSkeleton } from "@/components/design-system";
import {
  dsDashboardWidgetTitle,
  dsFocus,
  dsSurfaceInteractiveKpi,
  dsTypoCaption,
} from "@/lib/ui/design-system";
import {
  dsNotificationWidgetDangerChip,
  dsNotificationWidgetDangerRow,
} from "@/lib/ui/notification-ui";
import {
  formatDashboardMagMovementTime,
  formatDashboardMagRicambioTitle,
  formatDashboardMagScortaDeficit,
} from "@/lib/view/dashboard-widgets-selectors";
import { useDashboardMetrics } from "@/src/hooks/view/use-dashboard-metrics";

const kpiCardClass = `${dsSurfaceInteractiveKpi} min-w-0 max-w-full overflow-hidden ${dsFocus}`;
const widgetTitleClass = dsDashboardWidgetTitle;

function WidgetLoading() {
  return <LoadingCardSkeleton minHeightClass="min-h-[220px]" rows={3} />;
}

function WidgetError() {
  return <p className={`${dsTypoCaption} text-[color:var(--cab-danger)]`}>Dati non disponibili.</p>;
}

function WidgetEmpty({ message }: { message: string }) {
  return <p className={dsTypoCaption}>{message}</p>;
}

function KpiStat({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="min-w-0">
      <p className={`${dsTypoCaption} truncate`}>{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums text-[color:var(--cab-text)] ${valueClassName ?? ""}`.trim()}>
        {value}
      </p>
    </div>
  );
}

type MagazzinoSottoScortaRow = ReturnType<typeof useDashboardMetrics>["magSottoScortaRicambi"][number];

function MagazzinoSottoScortaListItem({ r }: { r: MagazzinoSottoScortaRow }) {
  return (
    <li>
      <div className={dsNotificationWidgetDangerRow}>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-[color:var(--cab-text)]">
          {formatDashboardMagRicambioTitle(r.marca, r.label)}
        </p>
        <span className={`${dsNotificationWidgetDangerChip} tabular-nums`}>
          {formatDashboardMagScortaDeficit(r.scorta, r.scortaMinima)}
        </span>
      </div>
    </li>
  );
}

export function DashboardMagazzinoKpiWidget() {
  const {
    staging,
    magStats,
    magSottoScortaRicambi,
    magDailyMovements,
    magRecentMovements,
    magLoading,
    magError,
  } = useDashboardMetrics();

  const sottoScortaPreview = magSottoScortaRicambi.slice(0, 3);

  return (
    <Link href="/magazzino" className={kpiCardClass} aria-label="Apri magazzino">
      <h2 className={`${widgetTitleClass} min-w-0 truncate`}>Magazzino</h2>
      {staging ? (
        <p className={`${dsTypoCaption} mt-4`}>Anteprima disabilitata in staging pubblico.</p>
      ) : magLoading ? (
        <div className="mt-4">
          <WidgetLoading />
        </div>
      ) : magError ? (
        <div className="mt-4">
          <WidgetError />
        </div>
      ) : (
        <>
          <div className="mt-4 grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
            <KpiStat
              label="Sotto scorta"
              value={String(magStats.sottoScorta)}
              valueClassName={
                magStats.sottoScorta > 0 ? "text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))]" : undefined
              }
            />
            <KpiStat label="Entrate oggi" value={String(magDailyMovements.entrate)} />
            <KpiStat label="Uscite oggi" value={String(magDailyMovements.uscite)} />
          </div>
          <div className="mt-4 space-y-3">
            {magStats.sottoScorta > 0 ? (
              <ul className="space-y-2">
                {sottoScortaPreview.map((r) => (
                  <MagazzinoSottoScortaListItem key={r.id} r={r} />
                ))}
              </ul>
            ) : (
              <p className={dsTypoCaption}>Scorte OK · nessun alert</p>
            )}
            <div>
              <p className={`${dsTypoCaption} mb-1.5 font-semibold uppercase tracking-wide`}>Ultimi movimenti</p>
              {magRecentMovements.length === 0 ? (
                <WidgetEmpty message="Nessun movimento." />
              ) : (
                <ul className="space-y-1.5">
                  {magRecentMovements.map((m) => (
                    <li key={m.id} className="flex min-w-0 items-center gap-2 text-sm">
                      <Badge tone={m.tipo === "entrata" ? "ok" : "danger"}>{m.tipo === "entrata" ? "Entrata" : "Uscita"}</Badge>
                      <span className="min-w-0 flex-1 truncate text-[color:var(--cab-text)]">{m.label}</span>
                      <span className={`${dsTypoCaption} shrink-0 tabular-nums`}>×{m.quantita}</span>
                      <span className={`${dsTypoCaption} shrink-0 tabular-nums text-[color:var(--cab-text-muted)]`}>
                        {formatDashboardMagMovementTime(m.at)}
                      </span>
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
