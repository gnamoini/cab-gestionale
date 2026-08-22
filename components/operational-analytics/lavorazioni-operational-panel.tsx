"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { ReportAgingBacklogStackedChart } from "@/components/report/primitives/chart/aging-backlog-stacked-chart";
import { ReportCloseTimePrioritaChart } from "@/components/report/primitives/chart/close-time-priorita-chart";
import { ReportLavorazioniFunnelChart } from "@/components/report/primitives/chart/lavorazioni-funnel-chart";
import { ReportLavorazioniSection } from "@/components/report/report-lavorazioni-section";
import { ReportDataTable } from "@/components/report/design-system";
import {
  buildAgingBacklogStackedByStato,
  buildCloseTimeByPriorita,
  buildStatoAgingMatrix,
  buildWipFunnelByStato,
  listInterventiOltreSla,
} from "@/lib/report/lavorazioni-work-orders";
import { buildReportSemanticIndex } from "@/lib/report/report-semantic-index";
import { useOperationalLavorazioniData } from "@/lib/report/operational-module/use-operational-lavorazioni-data";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { LoadingCardSkeleton } from "@/components/design-system";

/** Owner surface: WIP, aging, SLA, import Excel — /lavorazioni */
export function LavorazioniOperationalPanel() {
  const data = useOperationalLavorazioniData();
  const settingsQ = useCabAppSettingsPayloadQuery({ tier: "static" });

  const semanticIndex = useMemo(
    () =>
      buildReportSemanticIndex({
        completate: data.completate,
        manualByMonth: data.manualByMonth,
        mezzi: data.mezzi,
      }),
    [data.completate, data.manualByMonth, data.mezzi],
  );

  const statoLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of settingsQ.data?.resolved?.lavorazioni.stati ?? []) map.set(s.id, s.label);
    return map;
  }, [settingsQ.data]);

  const statoColorById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of settingsQ.data?.resolved?.lavorazioni.stati ?? []) {
      if (s.color) map.set(s.id, s.color);
    }
    return map;
  }, [settingsQ.data]);

  const agingStacked = useMemo(
    () => buildAgingBacklogStackedByStato(data.attive, statoLabelById, statoColorById, data.anchor),
    [data.attive, statoLabelById, statoColorById, data.anchor],
  );

  const statoAgingRows = useMemo(
    () =>
      buildStatoAgingMatrix(data.attive, statoLabelById, data.anchor).map((r) => ({
        stato: r.stato,
        b0_7: r.buckets["0-7"],
        b8_14: r.buckets["8-14"],
        b15_30: r.buckets["15-30"],
        b30p: r.buckets["30+"],
        totale: r.totale,
      })),
    [data.attive, statoLabelById, data.anchor],
  );

  const funnelRows = useMemo(
    () => buildWipFunnelByStato(data.attive, statoLabelById),
    [data.attive, statoLabelById],
  );

  const closeByPriorita = useMemo(
    () => buildCloseTimeByPriorita(data.completate, data.range),
    [data.completate, data.range],
  );

  const slaRows = useMemo(
    () => listInterventiOltreSla(data.attive, statoLabelById, data.anchor),
    [data.attive, statoLabelById, data.anchor],
  );

  if (data.isLoading) {
    return <LoadingCardSkeleton minHeightClass="min-h-[8rem]" />;
  }

  return (
    <ShellCard
      title="Analisi operativa"
      subtitle="Backlog, aging e SLA — ultimi 3 mesi"
      collapsible
      defaultCollapsed
      persistScope="lavorazioni"
      persistKey="operational-analytics"
      data-testid="lavorazioni-operational-panel"
    >
      <div className="min-w-0 space-y-4">
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <ReportAgingBacklogStackedChart series={agingStacked} />
          <ReportDataTable configId="lav-sla" rows={slaRows} />
        </div>
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <ReportLavorazioniFunnelChart rows={funnelRows} />
          <ReportCloseTimePrioritaChart rows={closeByPriorita} />
        </div>
        {statoAgingRows.length > 0 ? (
          <ReportDataTable configId="lav-stato-aging" rows={statoAgingRows} />
        ) : null}
        {slaRows.length > 0 ? (
          <p className="text-xs text-[color:var(--cab-text-muted)]">
            <Link href="/lavorazioni" className="font-medium text-[color:var(--cab-primary)] underline underline-offset-2">
              Apri gestionale lavorazioni
            </Link>
          </p>
        ) : null}
        <details className="rounded-lg border border-[color:var(--cab-border)] p-3">
          <summary className="cursor-pointer text-sm font-medium">Import dati storici Excel</summary>
          <div className="mt-3">
            <ReportLavorazioniSection
              attive={data.attive}
              completate={data.completate}
              anchor={data.anchor}
              filterRange={data.range}
              compareDetail={null}
              semanticIndex={semanticIndex}
              embed
              showManualImport
            />
          </div>
        </details>
      </div>
    </ShellCard>
  );
}
