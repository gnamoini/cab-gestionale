"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/gestionale/page-header";
import { PageActionMenu } from "@/components/ui";
import { LoadingCardSkeleton } from "@/components/design-system";
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { useCalendarV2Enabled } from "@/src/hooks/use-calendar-v2-enabled";
import { AdminNotificationsBell } from "@/components/dashboard/admin-notifications-bell";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";
import { clickPageActionHiddenTrigger } from "@/components/ui";
import { erpBtnNeutral } from "@/lib/ui/erp-tokens";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { dsStackPage } from "@/lib/ui/design-system";
import { deferredRouterReplace } from "@/lib/navigation/deferred-app-router";

const DashboardControlTowerLayout = dynamic(
  () =>
    import("@/components/dashboard/dashboard-control-tower-layout").then((m) => m.DashboardControlTowerLayout),
  { loading: () => <LoadingCardSkeleton minHeightClass="min-h-[12rem]" /> },
);
const CalendarV2Section = dynamic(
  () => import("@/components/dashboard/calendar-v2/calendar-v2-section").then((m) => m.CalendarV2Section),
  { loading: () => <LoadingCardSkeleton minHeightClass="min-h-[8rem]" /> },
);

export function DashboardView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const staging = isStagingPublicSlice();
  const calendarV2Enabled = useCalendarV2Enabled();
  const { readsDb, isLoading: notificationsModeLoading } = useNotificationsV2Mode();
  const notificationsBellRef = useRef<HTMLDivElement>(null);
  const [stagingRouteHint, setStagingRouteHint] = useState(false);

  const dashboardMenuItems = useMemo(
    () =>
      readsDb || notificationsModeLoading
        ? []
        : [
            {
              id: "notifications",
              label: "Notifiche",
              description: "Visualizza le notifiche amministratore",
              onSelect: () => clickPageActionHiddenTrigger(notificationsBellRef.current),
            },
          ],
    [readsDb, notificationsModeLoading],
  );

  useEffect(() => {
    if (searchParams.get("staging_unavailable") === "1") setStagingRouteHint(true);
  }, [searchParams]);

  function dismissStagingRouteHint() {
    setStagingRouteHint(false);
    deferredRouterReplace(router, "/dashboard", { scroll: false });
  }

  return (
    <>
      <div ref={notificationsBellRef} className="sr-only" aria-hidden>
        <AdminNotificationsBell />
      </div>
      <PageHeader
        title="Dashboard"
        actions={staging ? null : <PageActionMenu items={dashboardMenuItems} />}
      />

      <div className={dsStackPage}>
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
        {!staging ? (
          calendarV2Enabled ? <CalendarV2Section /> : null
        ) : null}
        <DashboardControlTowerLayout />
      </div>
    </>
  );
}
