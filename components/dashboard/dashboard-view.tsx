"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/gestionale/page-header";
import { GestionalePageToolbarActions } from "@/components/gestionale/page-header-toolbar";
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { LoadingCardSkeleton } from "@/components/design-system";
import { useCalendarV2Enabled } from "@/src/hooks/use-calendar-v2-enabled";

const DashboardWidgetGrid = dynamic(
  () => import("@/components/dashboard/dashboard-widget-grid").then((m) => m.DashboardWidgetGrid),
  { loading: () => <LoadingCardSkeleton minHeightClass="min-h-[10rem]" /> },
);
const DashboardPromemoriaSection = dynamic(
  () =>
    import("@/components/dashboard/promemoria/dashboard-promemoria-section").then(
      (m) => m.DashboardPromemoriaSection,
    ),
  { loading: () => <LoadingCardSkeleton minHeightClass="min-h-[8rem]" /> },
);
const CalendarV2Section = dynamic(
  () => import("@/components/dashboard/calendar-v2/calendar-v2-section").then((m) => m.CalendarV2Section),
  { loading: () => <LoadingCardSkeleton minHeightClass="min-h-[8rem]" /> },
);
const DashboardSistemaLogListEmbedded = dynamic(
  () =>
    import("@/components/dashboard/dashboard-sistema-log-section").then((m) => m.DashboardSistemaLogListEmbedded),
  { ssr: false },
);
import { DashboardNotificationsToolbarLeading } from "@/components/dashboard/dashboard-notifications-toolbar-leading";
import { Drawer } from "@/components/design-system";
import { gestionaleLogDrawerPanelClass } from "@/components/gestionale/gestionale-log-ui";
import { erpBtnNeutral } from "@/lib/ui/erp-tokens";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { dsStackPage } from "@/lib/ui/design-system";

export function DashboardView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const staging = isStagingPublicSlice();
  const calendarV2Enabled = useCalendarV2Enabled();
  const [logOpen, setLogOpen] = useState(false);
  const [stagingRouteHint, setStagingRouteHint] = useState(false);

  useEffect(() => {
    if (searchParams.get("staging_unavailable") === "1") setStagingRouteHint(true);
  }, [searchParams]);

  function dismissStagingRouteHint() {
    setStagingRouteHint(false);
    router.replace("/dashboard", { scroll: false });
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          staging ? null : (
            <GestionalePageToolbarActions
              canUndo={false}
              undoDisabled
              leading={<DashboardNotificationsToolbarLeading />}
              onOpenLog={() => setLogOpen(true)}
              logTitle="Log modifiche dashboard"
            />
          )
        }
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
        {!staging ? (calendarV2Enabled ? <CalendarV2Section /> : <DashboardPromemoriaSection />) : null}
        <DashboardWidgetGrid />
      </div>

      {staging ? null : (
        <Drawer open={logOpen} onClose={() => setLogOpen(false)} title="Log modifiche" ariaLabel="Log modifiche dashboard">
          <div className={gestionaleLogDrawerPanelClass}>
            <DashboardSistemaLogListEmbedded dismissible paged />
          </div>
        </Drawer>
      )}
    </>
  );
}
