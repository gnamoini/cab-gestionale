"use client";

import Link from "next/link";
import { useMemo } from "react";
import { dsFocus, dsSurfaceInteractiveKpi, dsSurfacePanel, dsTypoSmall } from "@/lib/ui/design-system";
import { DashboardTasksPanel } from "@/components/dashboard/dashboard-tasks-panel";
import { formatTitleCasePhrase } from "@/lib/gestionale-log/view-model";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { useDashboardMetrics } from "@/src/hooks/view/use-dashboard-metrics";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { statoLavorazioneLabel } from "@/src/shared/selectors";

const cardClass = `${dsSurfaceInteractiveKpi} ${dsFocus}`;

const kpiCardBadgeClass =
  "rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:color-mix(in_srgb,var(--cab-primary)_95%,var(--cab-text))]";

export function DashboardOperationalCards() {
  const staging = isStagingPublicSlice();
  const globalOpts = useGlobalOptions({ debugTag: "DashboardOperationalCards" });
  const { lavCount, preview, magStats, isLoading, isError } = useDashboardMetrics();

  const eur = useMemo(
    () =>
      new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(magStats.cap),
    [magStats.cap],
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Link href="/lavorazioni" className={cardClass} aria-label="Apri lavorazioni attive">
        <div className="flex items-start justify-between gap-2">
          <h2 className={`${dsTypoSmall} font-bold uppercase tracking-wide text-[color:var(--cab-primary)]`}>Lavorazioni attive</h2>
          <span className={kpiCardBadgeClass}>Operativo</span>
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums text-[color:var(--cab-text)]">{lavCount}</p>
        <ul className="mt-4 flex-1 space-y-2 text-sm text-[color:color-mix(in_srgb,var(--cab-text-muted)_35%,var(--cab-text))]">
          {isLoading ? (
            <li className="text-[color:var(--cab-text-muted)]">Caricamento…</li>
          ) : isError ? (
            <li className="text-[color:var(--cab-danger)]">Impossibile caricare le lavorazioni. Riprova più tardi.</li>
          ) : preview.length === 0 ? (
            <li className="text-[color:var(--cab-text-muted)]">Nessuna lavorazione attiva.</li>
          ) : (
            preview.map((r) => (
              <li key={r.id} className="flex gap-2 leading-snug">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: statoDisplayColor(r.stato, globalOpts.lavorazioni.stati) }}
                  aria-hidden
                />
                <span className="min-w-0 truncate">
                  <span className="font-medium text-[color:var(--cab-text)]">{formatTitleCasePhrase(r.macchina)}</span>
                  <span className="text-[color:var(--cab-text-muted)]"> · {statoLavorazioneLabel(r.stato, globalOpts.lavorazioni.stati)}</span>
                </span>
              </li>
            ))
          )}
        </ul>
      </Link>

      <Link href="/magazzino" className={cardClass} aria-label="Apri magazzino">
        <div className="flex items-start justify-between gap-2">
          <h2 className={`${dsTypoSmall} font-bold uppercase tracking-wide text-[color:var(--cab-primary)]`}>Magazzino</h2>
          <span className={kpiCardBadgeClass}>Stock</span>
        </div>
        {staging ? (
          <p className="mt-3 text-sm text-[color:var(--cab-text-muted)]">Anteprima disabilitata in staging pubblico.</p>
        ) : (
          <>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-[color:var(--cab-text)]">{magStats.tot}</p>
            <div className={`${dsSurfacePanel} mt-4 space-y-1.5 p-3 text-sm`}>
              <p className="flex justify-between gap-2">
                <span className="text-[color:var(--cab-text-muted)]">Sotto scorta</span>
                <span className="font-semibold tabular-nums text-[color:var(--cab-text)]">{magStats.sotto}</span>
              </p>
              <p className="flex justify-between gap-2">
                <span className="text-[color:var(--cab-text-muted)]">Capitale immobilizzato</span>
                <span className="font-semibold tabular-nums text-[color:var(--cab-text)]">{eur}</span>
              </p>
            </div>
          </>
        )}
      </Link>

      <div className={`${dsSurfacePanel} flex min-h-[12rem] flex-col p-4`}>
        <DashboardTasksPanel />
      </div>
    </div>
  );
}
