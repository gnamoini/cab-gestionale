"use client";

import Link from "next/link";
import { useMemo } from "react";
import { dsBadgeOk, dsFocus, dsSurfaceInteractiveKpi, dsSurfacePanel, dsTypoSmall } from "@/lib/ui/design-system";
import { DashboardTasksPanel } from "@/components/dashboard/dashboard-tasks-panel";
import { labelLavorazioneStatoDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import { formatTitleCasePhrase } from "@/lib/gestionale-log/view-model";
import { capitaleImmobilizzato } from "@/lib/magazzino/calculations";
import { MOCK_RICAMBI } from "@/lib/mock-data/magazzino";
import { LAVORAZIONI_STATI_IN_CORSO } from "@/src/services/lavorazioni.service";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";

const cardClass = `${dsSurfaceInteractiveKpi} ${dsFocus}`;

function macchinaLabel(row: { mezzo: { marca: string; modello: string } | null }): string {
  const m = row.mezzo;
  return m ? `${m.marca} ${m.modello}`.trim() : "—";
}

export function DashboardOperationalCards() {
  const lavFilters = useMemo(
    () => ({ includeMezzo: true as const, stati_in: [...LAVORAZIONI_STATI_IN_CORSO] }),
    [],
  );
  const lavQuery = useLavorazioniList(lavFilters, { staleTime: 30_000 });
  const rows = lavQuery.data ?? [];
  const preview = useMemo(() => rows.slice(0, 3), [rows]);

  const magStats = useMemo(() => {
    const sotto = MOCK_RICAMBI.filter((p) => p.scorta < p.scortaMinima).length;
    const cap = MOCK_RICAMBI.reduce((acc, r) => acc + capitaleImmobilizzato(r), 0);
    const tot = MOCK_RICAMBI.length;
    return { sotto, cap, tot };
  }, []);

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
          <span className="rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:color-mix(in_srgb,var(--cab-primary)_95%,var(--cab-text))]">
            Operativo
          </span>
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums text-[color:var(--cab-text)]">{rows.length}</p>
        <ul className="mt-4 flex-1 space-y-2 text-sm text-[color:color-mix(in_srgb,var(--cab-text-muted)_35%,var(--cab-text))]">
          {lavQuery.isLoading ? (
            <li className="text-[color:var(--cab-text-muted)]">Caricamento…</li>
          ) : preview.length === 0 ? (
            <li className="text-[color:var(--cab-text-muted)]">Nessuna lavorazione attiva.</li>
          ) : (
            preview.map((r) => (
              <li key={r.id} className="flex gap-2 leading-snug">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--cab-primary)]" aria-hidden />
                <span>
                  <span className="font-medium text-[color:var(--cab-text)]">{formatTitleCasePhrase(macchinaLabel(r))}</span>
                  <span className="text-[color:var(--cab-text-muted)]"> — </span>
                  <span className="text-[color:var(--cab-text-muted)]">{formatTitleCasePhrase(labelLavorazioneStatoDb(r.stato))}</span>
                </span>
              </li>
            ))
          )}
        </ul>
        <p className={`mt-3 ${dsTypoSmall} font-semibold text-[color:var(--cab-primary)] group-hover:underline`}>Apri lavorazioni →</p>
      </Link>

      <Link href="/magazzino" className={cardClass} aria-label="Apri magazzino">
        <div className="flex items-start justify-between gap-2">
          <h2 className={`${dsTypoSmall} font-bold uppercase tracking-wide text-[color:var(--cab-primary)]`}>Magazzino / giacenze</h2>
          <span className="rounded-full bg-[color:color-mix(in_srgb,var(--cab-text-muted)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:var(--cab-text-muted)]">
            Stock
          </span>
        </div>
        <div className="mt-3 space-y-2">
          <div>
            <p className="text-3xl font-semibold tabular-nums text-[color:var(--cab-text)]">{magStats.sotto}</p>
            <p className={`${dsTypoSmall} font-medium`}>Avvisi giacenza (sotto scorta minima)</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[color:var(--cab-border)] pt-3 text-sm">
            <div>
              <p className="text-lg font-semibold tabular-nums text-[color:var(--cab-text)]">{eur}</p>
              <p className={dsTypoSmall}>Capitale immobilizzato</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums text-[color:var(--cab-text)]">{magStats.tot}</p>
              <p className={dsTypoSmall}>Articoli (anagrafica demo)</p>
            </div>
          </div>
        </div>
        <p className={`mt-auto pt-3 ${dsTypoSmall} font-semibold text-[color:var(--cab-primary)] group-hover:underline`}>Apri magazzino →</p>
      </Link>

      <div className={`${dsSurfacePanel} md:col-span-2 xl:col-span-1`}>
        <div className="flex items-start justify-between gap-2">
          <h2 className={`${dsTypoSmall} font-bold uppercase tracking-wide text-[color:var(--cab-primary)]`}>Cose da fare</h2>
          <span className={dsBadgeOk}>Note</span>
        </div>
        <div className="mt-3 min-h-0 flex-1">
          <DashboardTasksPanel />
        </div>
      </div>
    </div>
  );
}
