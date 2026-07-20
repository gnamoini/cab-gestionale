"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ReportIngressiChiusureChart } from "@/components/report/primitives/chart/ingressi-chiusure-chart";
import { ReportAgingBacklogStackedChart } from "@/components/report/primitives/chart/aging-backlog-stacked-chart";
import { ReportCloseTimePrioritaChart } from "@/components/report/primitives/chart/close-time-priorita-chart";
import { ReportLavorazioniFunnelChart } from "@/components/report/primitives/chart/lavorazioni-funnel-chart";
import { ReportLavorazioniSection } from "@/components/report/report-lavorazioni-section";
import { useReportAnalyticsDerivedActions } from "@/components/report/report-analytics-derived-context";
import { ReportExecutiveSummaryContent } from "@/components/report/layout/report-executive-overview";
import { ReportExecutiveKpiSection } from "@/components/report/layout/report-executive-kpi-section";
import { ReportLavorazioniBacklogAlerts } from "@/components/report/layout/report-lavorazioni-backlog-alerts";
import { ReportLavorazioniFilters } from "@/components/report/layout/report-lavorazioni-filters";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-context";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { ReportBarChart, ReportDataTable, ReportMatrix, ReportSection } from "@/components/report/design-system";
import { usePublishWhenReady } from "@/components/report/sections/use-section-publish";
import { reportComparePublishInput } from "@/lib/report/report-compare-publish";
import {
  applyLavorazioniReportFilters,
  buildAgingBacklogStackedByStato,
  buildBacklogTrendProxy,
  buildCloseTimeByPriorita,
  buildIngressiChiusureMonthlyPoints,
  buildMtbfMttrByMezzo,
  buildStatoAgingMatrix,
  buildWipFunnelByStato,
  listInterventiOltreSla,
  listRecidivaMezzi,
  type LavorazioniReportFilters,
} from "@/lib/report/lavorazioni-work-orders";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";

const EMPTY_FILTERS: LavorazioniReportFilters = { priorita: "", statoId: "", clienteQ: "" };

export default function ReportLavorazioniSectionView(props: DomainReportSectionProps) {
  const { partitioned, perf } = useReportPerformanceContext();
  const { publishOperationalAnalytics } = useReportAnalyticsDerivedActions();
  const settingsQ = useCabAppSettingsPayloadQuery({ tier: "static" });
  const [filters, setFilters] = useState<LavorazioniReportFilters>(EMPTY_FILTERS);

  const statoLabelById = useMemo(() => {
    const map = new Map<string, string>();
    const stati = settingsQ.data?.resolved?.lavorazioni.stati ?? [];
    for (const s of stati) map.set(s.id, s.label);
    return map;
  }, [settingsQ.data]);

  const statoColorById = useMemo(() => {
    const map = new Map<string, string>();
    const stati = settingsQ.data?.resolved?.lavorazioni.stati ?? [];
    for (const s of stati) if (s.color) map.set(s.id, s.color);
    return map;
  }, [settingsQ.data]);

  const statoOptions = useMemo(
    () => (settingsQ.data?.resolved?.lavorazioni.stati ?? []).map((s) => ({ id: s.id, label: s.label })),
    [settingsQ.data],
  );

  const filtered = useMemo(
    () => applyLavorazioniReportFilters(props.attive, props.completate, filters),
    [props.attive, props.completate, filters],
  );

  usePublishWhenReady(
    props.fetchEnabled,
    [
      props.rangeKey,
      props.attive,
      props.storico,
      props.completate,
      props.lavListRows,
      props.manualByMonth,
    ],
    (requestId) => {
      publishOperationalAnalytics({
        rangeKey: props.rangeKey,
        requestId,
        range: props.range,
        ...reportComparePublishInput(props),
        attive: props.attive,
        storico: props.storico,
        completate: props.completate,
        lavRows: props.lavListRows,
        manualByMonth: props.manualByMonth,
      });
    },
  );

  const ingressiChiusurePoints = useMemo(
    () =>
      buildIngressiChiusureMonthlyPoints(
        filtered.attive,
        props.storico,
        filtered.completate,
        props.range,
        props.manualByMonth,
      ),
    [filtered.attive, filtered.completate, props.storico, props.range, props.manualByMonth],
  );

  const backlogTrendPoints = useMemo(
    () => buildBacklogTrendProxy(ingressiChiusurePoints),
    [ingressiChiusurePoints],
  );

  const agingStacked = useMemo(
    () => buildAgingBacklogStackedByStato(filtered.attive, statoLabelById, statoColorById, props.anchor),
    [filtered.attive, statoLabelById, statoColorById, props.anchor],
  );

  const statoAgingRows = useMemo(
    () =>
      buildStatoAgingMatrix(filtered.attive, statoLabelById, props.anchor).map((r) => ({
        stato: r.stato,
        b0_7: r.buckets["0-7"],
        b8_14: r.buckets["8-14"],
        b15_30: r.buckets["15-30"],
        b30p: r.buckets["30+"],
        totale: r.totale,
      })),
    [filtered.attive, statoLabelById, props.anchor],
  );

  const funnelRows = useMemo(
    () => buildWipFunnelByStato(filtered.attive, statoLabelById),
    [filtered.attive, statoLabelById],
  );

  const closeByPriorita = useMemo(
    () => buildCloseTimeByPriorita(filtered.completate, props.range),
    [filtered.completate, props.range],
  );

  const slaRows = useMemo(
    () => listInterventiOltreSla(filtered.attive, statoLabelById, props.anchor),
    [filtered.attive, statoLabelById, props.anchor],
  );

  const recidivaRows = useMemo(
    () => listRecidivaMezzi(filtered.completate, props.range),
    [filtered.completate, props.range],
  );

  const mtbfRows = useMemo(
    () =>
      buildMtbfMttrByMezzo(filtered.completate, props.range).map((r) => ({
        mezzo: r.mezzo,
        cliente: r.cliente,
        interventi: r.interventi,
        mttr: r.mttr,
        mtbf: r.mtbf == null ? "—" : r.mtbf,
      })),
    [filtered.completate, props.range],
  );

  const kpiItems = partitioned.lavorazioni;

  return (
    <div className="min-w-0 space-y-4">
      <ReportSection
        id="report-lav-panoramica"
        title="Panoramica operativa"
        subtitle="Throughput, WIP e indicatori chiave nel periodo"
      >
        <ReportExecutiveSummaryContent
          compareMode={props.analyticsContext.compareMode}
          variant="operations"
        />
        <div className="mt-4">
          <ReportLavorazioniFilters filters={filters} statoOptions={statoOptions} onChange={setFilters} />
        </div>
        {kpiItems.length > 0 ? (
          <div className="mt-4">
            <ReportExecutiveKpiSection
              items={kpiItems}
              compareMode={props.analyticsContext.compareMode}
            />
          </div>
        ) : null}
        <div className="mt-4 min-w-0">
          <ReportIngressiChiusureChart points={ingressiChiusurePoints} />
        </div>
        <div className="mt-4 min-w-0">
          <ReportMatrix title="Heatmap stagionalità">
            <ReportLavorazioniSection
              attive={props.attive}
              completate={props.completate}
              anchor={props.anchor}
              filterRange={props.range}
              compareDetail={props.compareDetail}
              semanticIndex={props.semanticIndex}
              embed
            />
          </ReportMatrix>
        </div>
        {backlogTrendPoints.length > 1 ? (
          <div className="mt-4">
            <ReportBarChart
              points={backlogTrendPoints.map((p) => ({ label: p.label, value: p.wipProxy }))}
              title="Trend accumulo (proxy)"
            />
          </div>
        ) : null}
      </ReportSection>

      <ReportSection
        id="report-lav-backlog"
        title="Backlog e SLA"
        subtitle="Aging delle aperte e interventi oltre soglia"
      >
        {perf?.alerts ? <ReportLavorazioniBacklogAlerts alerts={perf.alerts} /> : null}
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <ReportAgingBacklogStackedChart series={agingStacked} />
          <div id="report-lav-sla-table">
            <ReportDataTable configId="lav-sla" rows={slaRows} />
            {slaRows.length > 0 ? (
              <p className="mt-2 text-xs text-[color:var(--cab-text-muted)]">
                <Link href="/lavorazioni" className="font-medium text-[color:var(--cab-primary)] underline underline-offset-2">
                  Apri gestionale lavorazioni
                </Link>
                {" "}per il dettaglio operativo.
              </p>
            ) : null}
          </div>
        </div>
        {recidivaRows.length > 0 ? (
          <div id="report-lav-recidiva-table" className="mt-4">
            <ReportDataTable configId="lav-recidiva" rows={recidivaRows} />
          </div>
        ) : null}
      </ReportSection>

      <ReportSection
        id="report-lav-analisi"
        title="Analisi operativa"
        subtitle="Funnel stati, tempi per priorità e matrice stato × aging"
      >
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <ReportLavorazioniFunnelChart rows={funnelRows} />
          <ReportCloseTimePrioritaChart rows={closeByPriorita} />
        </div>
        {statoAgingRows.length > 0 ? (
          <div className="mt-4">
            <ReportDataTable configId="lav-stato-aging" rows={statoAgingRows} />
          </div>
        ) : null}
      </ReportSection>

      <ReportSection
        id="report-lav-trend"
        title="Trend periodo"
        subtitle="Bilancio mensile ingressi, chiusure e accumulo"
        defaultCollapsed
      >
        <ReportIngressiChiusureChart points={ingressiChiusurePoints} />
      </ReportSection>

      <ReportSection
        id="report-lav-dettaglio"
        title="Dettaglio avanzato"
        subtitle="Affidabilità flotta e import dati storici"
        defaultCollapsed
      >
        {mtbfRows.length > 0 ? (
          <ReportDataTable configId="lav-mtbf" rows={mtbfRows} />
        ) : (
          <p className="text-sm text-[color:var(--cab-text-muted)]">
            Nessun dato MTBF/MTTR nel periodo (servono almeno due chiusure per mezzo).
          </p>
        )}
        <div className="mt-4">
          <ReportMatrix title="Import dati storici">
            <ReportLavorazioniSection
              attive={props.attive}
              completate={props.completate}
              anchor={props.anchor}
              filterRange={props.range}
              compareDetail={props.compareDetail}
              semanticIndex={props.semanticIndex}
              embed
              showManualImport
            />
          </ReportMatrix>
        </div>
        <p className="mt-4 text-sm text-[color:var(--cab-text-muted)]">
          Classifiche top mezzi e clienti: vedi sezione{" "}
          <button
            type="button"
            className="font-medium text-[color:var(--cab-primary)] underline underline-offset-2"
            onClick={() => {
              const el = document.getElementById("report-section-clienti_mezzi");
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            CLIENTI E MEZZI
          </button>
          .
        </p>
      </ReportSection>
    </div>
  );
}
