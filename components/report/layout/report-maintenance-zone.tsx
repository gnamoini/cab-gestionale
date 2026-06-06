"use client";

import { ShellCard } from "@/components/gestionale/shell-card";
import { KpiPerformanceCompliance } from "@/components/report/kpi-performance/kpi-performance-compliance";
import { ReportClassificheOperativePanel } from "@/components/report/report-classifiche-operative-panel";
import { ReportLavorazioniSection } from "@/components/report/report-lavorazioni-section";
import { ReportLavorazioniTemporalSection } from "@/components/report/report-lavorazioni-temporal-section";
import { ReportMagazzinoSection } from "@/components/report/report-magazzino-section";
import { ReportRicambiConsumoSection } from "@/components/report/report-ricambi-consumo-section";
import { ReportTopRicambi } from "@/components/report/report-tops";
import {
  reportSectionGroupDescClass,
  reportSubsectionTitleClass,
  reportZoneShellClass,
} from "@/components/report/report-ui-tokens";
import type { ReportCompareDetail } from "@/lib/report/build-report-model";
import type { DateRange } from "@/lib/report/date-ranges";
import type { ReportDerivedBundle } from "@/lib/report/report-derived-cache";
import type { ReportSemanticIndex } from "@/lib/report/report-semantic-index";
import type { TopClienteReportRow, TopMezzoReportRow, TopRicambioReportRow } from "@/lib/report/report-classifiche";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { ReportManualEntryRow } from "@/src/types/supabase-tables";

export function ReportMaintenanceZone({
  attive,
  completate,
  manualEntries,
  anchor,
  filterRange,
  compareDetail,
  semanticIndex,
  derivedBundle,
  prodotti,
  histRev,
  onHistRev,
  topsMezzi,
  topsClienti,
  topsRicambi,
  showCompare,
}: {
  attive: LavorazioneAttiva[];
  completate: LavorazioneArchiviata[];
  manualEntries: ReportManualEntryRow[];
  anchor: Date;
  filterRange: DateRange;
  compareDetail: ReportCompareDetail | null;
  semanticIndex: ReportSemanticIndex;
  derivedBundle: ReportDerivedBundle;
  prodotti: RicambioMagazzino[];
  histRev: number;
  onHistRev: () => void;
  topsMezzi: TopMezzoReportRow[];
  topsClienti: TopClienteReportRow[];
  topsRicambi: TopRicambioReportRow[];
  showCompare: boolean;
}) {
  return (
    <ShellCard
      id="report-maintenance"
      title="Analisi approfondite e dettaglio"
      subtitle="Matrici lavorazioni, magazzino, consumi e classifiche granulari"
      collapsible
      defaultCollapsed
      className={reportZoneShellClass}
    >
      <p className={reportSectionGroupDescClass}>
        Sezione per analisi puntuali e tabelle esportabili. Espandi solo le voci necessarie per ridurre il rumore
        visivo nella panoramica.
      </p>

      <div className="mt-4 min-w-0 space-y-4">
        <section className="min-w-0 space-y-3" aria-labelledby="report-deep-lavorazioni">
          <h2 id="report-deep-lavorazioni" className={reportSubsectionTitleClass}>
            Matrici lavorazioni
          </h2>
          <ReportLavorazioniSection
            attive={attive}
            completate={completate}
            manualEntries={manualEntries}
            anchor={anchor}
            filterRange={filterRange}
            compareDetail={compareDetail}
            semanticIndex={semanticIndex}
          />
        </section>

        <ShellCard
          id="report-lavorazioni-temporal"
          title="Tabella mensile lavorazioni"
          subtitle="Espansione settimanale per mese"
          collapsible
          defaultCollapsed
        >
          <ReportLavorazioniTemporalSection
            filterRange={filterRange}
            anchor={anchor}
            semanticIndex={semanticIndex}
            embed
            showKpiChart={false}
            showTable
          />
        </ShellCard>

        <ShellCard title="Magazzino e movimenti" collapsible defaultCollapsed>
          <ReportMagazzinoSection
            derivedBundle={derivedBundle}
            prodotti={prodotti}
            anchor={anchor}
            range={filterRange}
            compareDetail={compareDetail}
            histRev={histRev}
            onHistRev={onHistRev}
          />
        </ShellCard>

        <ShellCard title="Consumo ricambi" collapsible defaultCollapsed>
          <ReportRicambiConsumoSection
            magLogSorted={derivedBundle.magLogSorted}
            prodotti={prodotti}
            filterRange={filterRange}
            anchor={anchor}
          />
        </ShellCard>

        {topsRicambi.length > 0 ? (
          <ShellCard title="Top ricambi per movimenti" collapsible defaultCollapsed>
            <ReportTopRicambi rows={topsRicambi} showCompare={showCompare} />
          </ShellCard>
        ) : null}

        <ShellCard
          id="report-classifiche"
          title="Classifiche operative"
          subtitle="Top mezzi e clienti nel periodo"
          collapsible
          defaultCollapsed
        >
          <ReportClassificheOperativePanel mezzi={topsMezzi} clienti={topsClienti} showCompare={showCompare} />
        </ShellCard>

        <ShellCard
          id="report-compliance"
          title="Scadenze e compliance"
          subtitle="Dati non ancora modellati nel gestionale"
          collapsible
          defaultCollapsed
        >
          <KpiPerformanceCompliance />
        </ShellCard>
      </div>
    </ShellCard>
  );
}
