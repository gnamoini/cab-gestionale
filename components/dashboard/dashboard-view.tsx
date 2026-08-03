"use client";

import dynamic from "next/dynamic";
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { DashboardControlTowerLayout } from "@/components/dashboard/dashboard-control-tower-layout";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCalendarV2Enabled } from "@/src/hooks/use-calendar-v2-enabled";
import { erpBtnNeutral } from "@/lib/ui/erp-tokens";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { deferredRouterReplace } from "@/lib/navigation/deferred-app-router";

const CalendarV2Section = dynamic(
  () => import("@/components/dashboard/calendar-v2/calendar-v2-section").then((m) => m.CalendarV2Section),
);

export function DashboardView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const staging = isStagingPublicSlice();
  const calendarV2Enabled = useCalendarV2Enabled();
  const [stagingRouteHint, setStagingRouteHint] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("staging_unavailable") === "1") setStagingRouteHint(true);
  }, [searchParams]);

  function dismissStagingRouteHint() {
    setStagingRouteHint(false);
    deferredRouterReplace(router, "/dashboard", { scroll: false });
  }

  return (
    <>
      {stagingRouteHint ? (
          <div className="flex max-w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-50">
            <p className="min-w-0 flex-1 leading-relaxed">
              Il modulo richiesto non è ancora disponibile in questo ambiente di staging (solo sezioni principali attive).
            </p>
            <button type="button" className={erpBtnNeutral} onClick={() => dismissStagingRouteHint()}>
              Chiudi
            </button>
          </div>
        ) : null}

        <DashboardWelcome />
        {!staging && calendarV2Enabled ? (
          calendarOpen ? (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  className={erpBtnNeutral}
                  onClick={() => setCalendarOpen(false)}
                >
                  Chiudi calendario
                </button>
              </div>
              <CalendarV2Section />
            </>
          ) : (
            <div className="flex justify-end">
              <button type="button" className={erpBtnNeutral} onClick={() => setCalendarOpen(true)}>
                Apri calendario operativo
              </button>
            </div>
          )
        ) : null}
        <DashboardControlTowerLayout />
    </>
  );
}
