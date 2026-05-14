"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/gestionale/page-header";
import {
  gestionaleLogPanelAsideClass,
  gestionaleLogPanelHeaderClass,
  IconGestionaleLog,
} from "@/components/gestionale/gestionale-log-ui";
import { DashboardSistemaLogListEmbedded } from "@/components/dashboard/dashboard-sistema-log-section";
import { DashboardOperationalCards } from "@/components/dashboard/dashboard-operational-cards";
import { DashboardQuickNav } from "@/components/dashboard/dashboard-quick-nav";
import { DashboardRecentFeeds } from "@/components/dashboard/dashboard-recent-feeds";
import { MezziServiceDemo } from "@/components/demo/mezzi-service-demo";
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { SistemaImpostazioniModal } from "@/components/dashboard/sistema-impostazioni-modal";
import { erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsBtnSettings, dsPageToolbarBtn, dsStackPage, dsZDrawer } from "@/lib/ui/design-system";

export function DashboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sistemaOpen, setSistemaOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("openSistema") === "1") {
      setSistemaOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  useEffect(() => {
    if (!logOpen) return;
    const gap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      document.body.style.paddingRight = prevPad;
    };
  }, [logOpen]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className={`${dsPageToolbarBtn} shrink-0 px-2.5 sm:px-3`}
              title="Storico modifiche dashboard"
            >
              <IconGestionaleLog />
              <span className="sr-only">Log modifiche</span>
            </button>
            <button type="button" className={dsBtnSettings} onClick={() => setSistemaOpen(true)} aria-label="Impostazioni sistema">
              <svg className="h-4 w-4 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Impostazioni
            </button>
          </>
        }
      />

      <div className={dsStackPage}>
        <DashboardWelcome />

        <DashboardOperationalCards />

        <DashboardQuickNav />

        <DashboardRecentFeeds />

        <div className="mt-6 max-w-xl">
          <MezziServiceDemo />
        </div>
      </div>

      {sistemaOpen ? <SistemaImpostazioniModal open={sistemaOpen} onClose={() => setSistemaOpen(false)} /> : null}

      {logOpen ? (
        <div
          className={`fixed inset-0 ${dsZDrawer} flex items-stretch justify-end bg-[var(--cab-overlay)] backdrop-blur-[1px]`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              setLogOpen(false);
            }
          }}
        >
          <aside
            className={gestionaleLogPanelAsideClass}
            aria-label="Log modifiche dashboard"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={gestionaleLogPanelHeaderClass}>
              <h2 className="text-sm font-semibold text-[color:var(--cab-text)]">Log modifiche</h2>
              <button type="button" onClick={() => setLogOpen(false)} className={erpBtnNeutral}>
                Chiudi
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
              <DashboardSistemaLogListEmbedded dismissible paged />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
