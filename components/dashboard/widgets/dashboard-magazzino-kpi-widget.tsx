"use client";

import Link from "next/link";
import { useControlTowerContext } from "@/components/dashboard/control-tower-metrics-provider";
import { CONTROL_TOWER_KPI_WINDOW_LABEL } from "@/lib/dashboard/control-tower-constants";
import { LoadingCardSkeleton } from "@/components/design-system";
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
import { formatDashboardMagRicambioTitle, formatDashboardMagScortaDeficit } from "@/lib/view/dashboard-widgets-selectors";

const kpiCardClass = `${dsSurfaceInteractiveKpi} min-w-0 max-w-full overflow-hidden ${dsFocus}`;

export function DashboardMagazzinoKpiWidget() {
  const { staging, slices, isLoading } = useControlTowerContext();
  const mag = slices?.magazzinoOps;

  if (staging) {
    return (
      <section className={`${kpiCardClass} p-4`}>
        <h2 className={dsDashboardWidgetTitle}>Magazzino operativo</h2>
        <p className={`${dsTypoCaption} mt-4`}>Anteprima disabilitata in staging pubblico.</p>
      </section>
    );
  }

  if (isLoading && !mag) {
    return <LoadingCardSkeleton minHeightClass="min-h-[12rem]" rows={3} />;
  }

  const sottoPreview = mag?.sottoScortaPreview ?? [];

  return (
    <Link href="/magazzino" className={kpiCardClass} aria-label="Apri magazzino">
      <h2 className={dsDashboardWidgetTitle}>Magazzino operativo</h2>
      <p className={`${dsTypoCaption} mt-1`}>{CONTROL_TOWER_KPI_WINDOW_LABEL} · movimenti</p>
      <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
        <div>
          <p className={dsTypoCaption}>Sotto scorta</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-[color:var(--cab-text)]">{mag?.sottoScortaCount ?? 0}</p>
        </div>
        <div>
          <p className={dsTypoCaption}>Movimenti settimana</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">{mag?.movimentiSettimana ?? 0}</p>
        </div>
      </div>
      {sottoPreview.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {sottoPreview.map((r) => (
            <li key={r.id}>
              <div className={dsNotificationWidgetDangerRow}>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">{formatDashboardMagRicambioTitle(r.marca, r.label)}</p>
                <span className={`${dsNotificationWidgetDangerChip} tabular-nums`}>
                  {formatDashboardMagScortaDeficit(r.scorta, r.scortaMinima)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`${dsTypoCaption} mt-4`}>Scorte OK</p>
      )}
      {(mag?.topConsumo.length ?? 0) > 0 ? (
        <div className="mt-4">
          <p className={`${dsTypoCaption} mb-1.5 font-semibold uppercase tracking-wide`}>Più consumati</p>
          <ul className="space-y-1">
            {mag!.topConsumo.map((r) => (
              <li key={r.id} className="flex justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{r.label}</span>
                <span className="shrink-0 tabular-nums">×{r.totalUscite}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Link>
  );
}
