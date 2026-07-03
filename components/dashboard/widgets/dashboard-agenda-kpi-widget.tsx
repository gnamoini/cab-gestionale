"use client";

import Link from "next/link";
import { buildAgendaHref } from "@/lib/navigation/agenda-links";
import { useControlTowerContext } from "@/components/dashboard/control-tower-metrics-provider";
import { erpBtnNeutral } from "@/lib/ui/erp-tokens";
import { dsSurfaceCard, dsTypoCaption } from "@/lib/ui/design-system";

/** KPI agenda giorno corrente + link Agenda Officina. */
export function DashboardAgendaKpiWidget() {
  const { slices } = useControlTowerContext();
  const kpi = slices?.agendaKpi;
  if (!kpi) return null;

  return (
    <section className={dsSurfaceCard}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 border-b border-[color:var(--cab-border)] px-3 py-2">
        <h2 className="text-sm font-semibold text-[color:var(--cab-text)]">Agenda officina · oggi</h2>
        <Link href={buildAgendaHref()} className={erpBtnNeutral}>
          Apri Agenda
        </Link>
      </div>
      <ul className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <li>
          <p className={dsTypoCaption}>Ore pianificate</p>
          <p className="text-lg font-semibold tabular-nums">{kpi.plannedHoursToday} h</p>
        </li>
        <li>
          <p className={dsTypoCaption}>Eventi</p>
          <p className="text-lg font-semibold tabular-nums">{kpi.eventsToday}</p>
        </li>
        <li>
          <p className={dsTypoCaption}>In ritardo</p>
          <p className="text-lg font-semibold tabular-nums">{kpi.overdueCount}</p>
        </li>
        <li>
          <p className={dsTypoCaption}>Da confermare</p>
          <p className="text-lg font-semibold tabular-nums">{kpi.scheduledCount}</p>
        </li>
        <li>
          <p className={dsTypoCaption}>Saturazione</p>
          <p className="text-lg font-semibold tabular-nums">{kpi.saturationPct}%</p>
        </li>
      </ul>
    </section>
  );
}
