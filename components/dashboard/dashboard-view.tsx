"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/gestionale/page-header";
import { GestionalePageToolbarActions } from "@/components/gestionale/page-header-toolbar";
import { DashboardSistemaLogListEmbedded } from "@/components/dashboard/dashboard-sistema-log-section";
import { DashboardOperationalCards } from "@/components/dashboard/dashboard-operational-cards";
import { DashboardQuickNav } from "@/components/dashboard/dashboard-quick-nav";
import { DashboardRecentFeeds } from "@/components/dashboard/dashboard-recent-feeds";
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { Drawer } from "@/components/design-system";
import { erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { dsStackPage } from "@/lib/ui/design-system";

export function DashboardView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const staging = isStagingPublicSlice();
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
              onOpenLog={() => setLogOpen(true)}
              logTitle="Storico modifiche dashboard"
            />
          )
        }
      />

      <div className={dsStackPage}>
        {stagingRouteHint ? (
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-50">
            <p className="min-w-0 flex-1 leading-relaxed">
              Il modulo richiesto non è ancora disponibile in questo ambiente di staging (solo sezioni principali attive).
            </p>
            <button type="button" className={erpBtnNeutral} onClick={() => dismissStagingRouteHint()}>
              Chiudi
            </button>
          </div>
        ) : null}

        <DashboardWelcome />
        <DashboardOperationalCards />
        <DashboardQuickNav />
        <DashboardRecentFeeds />
      </div>

      {staging ? null : (
        <Drawer open={logOpen} onClose={() => setLogOpen(false)} title="Log modifiche" ariaLabel="Log modifiche dashboard">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
            <DashboardSistemaLogListEmbedded dismissible paged />
          </div>
        </Drawer>
      )}
    </>
  );
}
