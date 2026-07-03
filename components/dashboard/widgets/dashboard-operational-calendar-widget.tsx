"use client";

import Link from "next/link";
import { buildAgendaHref } from "@/lib/navigation/agenda-links";
import { DashboardAgendaKpiWidget } from "@/components/dashboard/widgets/dashboard-agenda-kpi-widget";
import { erpBtnNeutral } from "@/lib/ui/erp-tokens";
import { dsStackPage } from "@/lib/ui/design-system";

/** Calendario operativo — KPI agenda + link Agenda Officina. */
export function DashboardOperationalCalendarWidget() {
  return (
    <div className={dsStackPage}>
      <DashboardAgendaKpiWidget />
      <div className="flex justify-end">
        <Link href={buildAgendaHref()} className={erpBtnNeutral}>
          Pianificazione completa
        </Link>
      </div>
    </div>
  );
}
