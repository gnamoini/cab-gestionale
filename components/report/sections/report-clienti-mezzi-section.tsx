"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KpiPerformanceCompliance } from "@/components/report/kpi-performance/kpi-performance-compliance";
import { KpiPerformanceFleet } from "@/components/report/kpi-performance/kpi-performance-fleet";
import { ReportFleetAlerts } from "@/components/report/layout/report-fleet-alerts";
import { ReportFleetInsightStrip } from "@/components/report/layout/report-fleet-insight-strip";
import { useReportPerformanceContext } from "@/components/report/layout/report-performance-context";
import { ClientiParetoChart } from "@/components/report/primitives/chart/clienti-pareto-chart";
import { ReportTopMezzi } from "@/components/report/report-tops";
import { ReportUnifiedKpiGrid } from "@/components/report/design-system";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { ReportEmbeddedModule, ReportSection } from "@/components/report/design-system";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";
import {
  ReportClientiMezziDettaglioTabs,
} from "@/components/report/sections/report-clienti-mezzi-dettaglio-tabs";
import {
  ReportClientiMezziFilters,
  type ReportClientiMezziFiltersState,
} from "@/components/report/sections/report-clienti-mezzi-filters";
import { buildAssetLifecycleKpiModel } from "@/lib/report/asset-lifecycle/build-asset-lifecycle-kpi-model";
import { buildParetoClientiPoints } from "@/lib/report/kpi-performance/fleet-report-helpers";
import { buildMtbfMttrByMezzo, listRecidivaMezzi } from "@/lib/report/lavorazioni-work-orders";
import { buildTopClientiByFatturato } from "@/lib/report/report-classifiche";
import { isAssetLifecycleSubFlagActive } from "@/lib/officina/asset-lifecycle-v1-flag";
import { assetComplianceEntry } from "@/lib/domain/asset-compliance-entry";
import { assetTimelineEntry } from "@/lib/domain/asset-timeline-entry";
import { GESTIONALE_REPORT_STALE_MS } from "@/lib/react-query/query-layer-policies";
import { useAssetLifecycleV1Enabled } from "@/src/hooks/use-asset-lifecycle-v1-enabled";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";
import { dsTableRow, dsTableTd, dsTableWrap } from "@/lib/ui/design-system";

export default function ReportClientiMezziSectionView(props: DomainReportSectionProps) {
  const { perf, perfLoading, partitioned } = useReportPerformanceContext();
  const [filters, setFilters] = useState<ReportClientiMezziFiltersState>({
    clienteQ: "",
    soloCritici: false,
  });

  const lifecycleFlags = useAssetLifecycleV1Enabled();
  const lifecycleOn = isAssetLifecycleSubFlagActive(lifecycleFlags, "timeline_calendar");

  const timelineQuery = useQuery({
    queryKey: ["report-cm-lifecycle-timeline", props.rangeKey],
    queryFn: async () => {
      const res = await assetTimelineEntry.listInRange(props.range);
      return res.success ? res.data : [];
    },
    enabled: props.fetchEnabled && lifecycleOn,
    staleTime: GESTIONALE_REPORT_STALE_MS,
  });

  const complianceRulesQuery = useQuery({
    queryKey: ["report-cm-lifecycle-rules", props.rangeKey],
    queryFn: async () => {
      const res = await assetComplianceEntry.listUpcomingRules(90);
      return res.success ? res.data : [];
    },
    enabled: props.fetchEnabled && isAssetLifecycleSubFlagActive(lifecycleFlags, "compliance"),
    staleTime: GESTIONALE_REPORT_STALE_MS,
  });

  const lifecycleKpi = useMemo(() => {
    if (!lifecycleOn) return null;
    return buildAssetLifecycleKpiModel({
      anchor: props.anchor,
      timelineRows: timelineQuery.data ?? [],
      complianceRules: complianceRulesQuery.data ?? [],
      lavorazioni: props.lavListRows,
    });
  }, [lifecycleOn, props.anchor, props.lavListRows, timelineQuery.data, complianceRulesQuery.data]);

  const invoicesQ = useInvoicesQuery(props.fetchEnabled);
  const paretoPoints = useMemo(() => buildParetoClientiPoints(props.topsClienti), [props.topsClienti]);

  const recidivaRows = useMemo(
    () => listRecidivaMezzi(props.completate, props.range),
    [props.completate, props.range],
  );

  const mtbfRows = useMemo(
    () => buildMtbfMttrByMezzo(props.completate, props.range),
    [props.completate, props.range],
  );

  const redditivitaRows = useMemo(() => {
    const fatturato = buildTopClientiByFatturato(invoicesQ.invoices, props.range, 8);
    const interventiMap = new Map(props.topsClienti.map((r) => [r.cliente, r.interventi]));
    return fatturato.map((r) => ({
      cliente: r.cliente,
      fatturato: r.fatturato,
      interventi: interventiMap.get(r.cliente) ?? 0,
    }));
  }, [invoicesQ.invoices, props.range, props.topsClienti]);

  const parcoLabel =
    perf?.fleet.totalMezzi != null ? `Parco: ${perf.fleet.totalMezzi} mezzi` : undefined;

  return (
    <div className="min-w-0 space-y-4">
      {perfLoading || !perf ? (
        <LoadingSkeletonBlock className="min-h-[240px]" />
      ) : (
        <>
          <ReportSection
            id="report-cm-kpi"
            title="Indicatori flotta"
            subtitle={parcoLabel ?? "Disponibilità, fermi e guasti nel periodo"}
          >
            <ReportUnifiedKpiGrid items={partitioned.fleet} />
          </ReportSection>

          {perf.alerts.length > 0 ? (
            <ReportFleetAlerts alerts={perf.alerts} />
          ) : null}

          <ReportFleetInsightStrip
            fleet={perf.fleet}
            topsClienti={props.topsClienti}
            kmAnomalies={lifecycleKpi?.kmAnomalies.length ?? 0}
            mezziIdle={lifecycleKpi?.mezziIdleDays.filter((m) => m.daysSinceLastLavorazione >= 60).length ?? 0}
          />

          <ReportSection
            id="report-cm-filters"
            title="Filtri sezione"
            subtitle="Raffinare disponibilità e dettaglio operativo"
            defaultCollapsed
          >
            <ReportClientiMezziFilters filters={filters} onChange={setFilters} />
          </ReportSection>

          <ReportSection
            id="report-cm-fleet"
            title="Flotta e disponibilità"
            subtitle="Stato mezzi in officina, trend e disponibilità per cliente"
          >
            <ReportEmbeddedModule label="Flotta">
              <KpiPerformanceFleet data={perf.fleet} clienteFilter={filters.clienteQ} />
            </ReportEmbeddedModule>
          </ReportSection>

          <ReportSection
            id="report-cm-analisi"
            title="Analisi concentrazione"
            subtitle="Pareto clienti e redditività stimata"
            defaultCollapsed
          >
            <div className="grid min-w-0 gap-6 xl:grid-cols-2">
              <div className="min-w-0">
                <ClientiParetoChart points={paretoPoints} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">Redditività per cliente</h3>
                <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
                  Fatturato emesso nel periodo vs interventi chiusi (proxy operativo).
                </p>
                <div className={`mt-3 ${dsTableWrap}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[color:var(--cab-border)] text-left text-xs text-[color:var(--cab-text-muted)]">
                        <th className={`${dsTableTd} font-medium`}>Cliente</th>
                        <th className={`${dsTableTd} w-24 text-right font-medium`}>Fatturato</th>
                        <th className={`${dsTableTd} w-20 text-right font-medium`}>Lav.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {redditivitaRows.length === 0 ? (
                        <tr className={dsTableRow}>
                          <td colSpan={3} className={`${dsTableTd} text-[color:var(--cab-text-muted)]`}>
                            Nessun dato fatturato nel periodo.
                          </td>
                        </tr>
                      ) : (
                        redditivitaRows.map((r) => (
                          <tr key={r.cliente} className={dsTableRow}>
                            <td className={`${dsTableTd} max-w-[12rem] truncate`}>{r.cliente}</td>
                            <td className={`${dsTableTd} text-right tabular-nums`}>
                              {r.fatturato.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                            </td>
                            <td className={`${dsTableTd} text-right tabular-nums`}>{r.interventi}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </ReportSection>
        </>
      )}

      <ReportSection
        id="report-cm-classifiche"
        title="Dettaglio operativo"
        subtitle="Mezzi critici e classifiche clienti"
      >
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-[color:var(--cab-text)]">Top mezzi per interventi</h3>
          <ReportTopMezzi rows={props.topsMezzi} showCompare={props.showCompare} />
        </div>
        <ReportClientiMezziDettaglioTabs
          topsMezzi={props.topsMezzi}
          topsClienti={props.topsClienti}
          recidiva={recidivaRows}
          altaFrequenza={perf?.fleet.mezziAltaFrequenzaGuasti ?? []}
          mtbf={mtbfRows}
          showCompare={props.showCompare}
          soloCritici={filters.soloCritici}
        />
      </ReportSection>

      <ReportSection
        id="report-cm-compliance"
        title="Compliance e lifecycle"
        subtitle="Scadenze imminenti e adempimenti asset"
        defaultCollapsed
      >
        <KpiPerformanceCompliance />
        {lifecycleKpi && lifecycleKpi.kmAnomalies.length > 0 ? (
          <div className={`mt-4 ${dsTableWrap}`}>
            <h3 className="mb-2 text-sm font-semibold text-[color:var(--cab-text)]">Anomalie chilometriche</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--cab-border)] text-left text-xs text-[color:var(--cab-text-muted)]">
                  <th className={`${dsTableTd} font-medium`}>Mezzo</th>
                  <th className={`${dsTableTd} w-24 text-right font-medium`}>Δ km 30gg</th>
                  <th className={`${dsTableTd} w-24 text-right font-medium`}>Media gg</th>
                </tr>
              </thead>
              <tbody>
                {lifecycleKpi.kmAnomalies.slice(0, 8).map((a) => (
                  <tr key={a.mezzoId} className={dsTableRow}>
                    <td className={dsTableTd}>{a.mezzoId}</td>
                    <td className={`${dsTableTd} text-right tabular-nums`}>{a.deltaKm30d}</td>
                    <td className={`${dsTableTd} text-right tabular-nums`}>
                      {a.avgDailyKm.toLocaleString("it-IT", { maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </ReportSection>
    </div>
  );
}
