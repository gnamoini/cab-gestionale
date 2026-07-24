"use client";

import { useMemo } from "react";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import {
  ReportBarChart,
  ReportDataTable,
  ReportDomainMetricsGrid,
  ReportSection,
} from "@/components/report/design-system";
import { buildAnalisiOreOfficinaPayload } from "@/lib/analytics/hours/build-analisi-ore-officina-payload";
import { reportContentPanelClass } from "@/components/report/report-ui-tokens";
import { useReportTimesheetKpi } from "@/src/hooks/use-report-timesheet-kpi";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { addettiEmployeeMappingService } from "@/src/services/addetti-employee-mapping.service";
import { QK } from "@/src/lib/react-query/query-keys";
import type { ReportDomainMetric } from "@/lib/report/report-domain-types";

function trustBanner() {
  return (
    <div
      className="rounded-md border border-[color:var(--cab-warning-border)] bg-[color:var(--cab-warning-bg)] px-3 py-2 text-sm text-[color:var(--cab-text)]"
      role="status"
    >
      <p className="font-medium">Fonti dati ore</p>
      <p className="mt-1 text-[color:var(--cab-text-muted)]">
        Ore lavorate = consuntivo schede (actual_labor_hours). Presenze = cartellino. Preventivi = stime
        commerciali. KPI dipendente richiedono mapping addetto confermato.
      </p>
    </div>
  );
}

export default function ReportAnalisiOreOfficinaSectionView(props: DomainReportSectionProps) {
  const timesheet = useReportTimesheetKpi(props.range);
  const preventiviQ = usePreventiviRecordsQuery(props.fetchEnabled);
  const mappingsQ = useServiceQuery([...QK.dipendentiTimesheetEmployees, "addetti-mapping"], () =>
    addettiEmployeeMappingService.getAll(),
  );

  const schedeInterventiRows = useMemo(() => {
    if (!props.schedeStore) return [];
    return Object.entries(props.schedeStore).map(([lavorazioneId, bundle]) => ({
      lavorazione_id: lavorazioneId,
      contenuto: (bundle.lavorazioni ?? { tipo: "lavorazioni", campi: { righe: [] } }) as unknown as Record<
        string,
        unknown
      >,
    }));
  }, [props.schedeStore]);

  const payload = useMemo(() => {
    if (timesheet.isLoading || preventiviQ.isLoading || mappingsQ.isLoading) return null;
    return buildAnalisiOreOfficinaPayload({
      range: props.range,
      completate: props.completate,
      lavListRows: props.lavListRows,
      schedeStore: props.schedeStore,
      schedeInterventiRows,
      timesheetEntries: timesheet.entries,
      timesheetEmployees: timesheet.employees,
      mappings: mappingsQ.data ?? [],
      preventivi: preventiviQ.records,
    });
  }, [
    timesheet.isLoading,
    timesheet.entries,
    timesheet.employees,
    preventiviQ.isLoading,
    preventiviQ.records,
    mappingsQ.isLoading,
    mappingsQ.data,
    props.range,
    props.completate,
    props.lavListRows,
    props.schedeStore,
    schedeInterventiRows,
  ]);

  const qualityMetrics: ReportDomainMetric[] = payload
    ? [
        {
          id: "integrity-validated",
          label: "Ore validate",
          state: { status: "available", value: `${payload.integrity.validatedPct}%` },
        },
        {
          id: "integrity-missing",
          label: "Senza consuntivo",
          state: { status: "available", value: String(payload.integrity.missingCount) },
        },
        {
          id: "integrity-unmapped",
          label: "Addetti non mappati",
          state: { status: "available", value: String(payload.integrity.unmappedCount) },
        },
      ]
    : [];

  const presenceBarPoints =
    payload?.utilization.rows.slice(0, 12).map((r) => ({
      label: r.employeeName,
      value: r.presenceHours,
    })) ?? [];

  const actualBarPoints =
    payload?.utilization.rows.slice(0, 12).map((r) => ({
      label: r.employeeName,
      value: r.actualLaborHours,
    })) ?? [];

  const produttivitaRows =
    payload?.utilization.rows.map((r) => ({
      id: r.employeeId,
      dipendente: r.employeeName,
      presenza: `${r.presenceHours} h`,
      consuntivo: `${r.actualLaborHours} h`,
      utilizzo: r.utilizationPct != null ? `${r.utilizationPct}%` : "—",
      interventi: r.completedJobs,
    })) ?? [];

  const stimaRows =
    payload?.estimateVsActual.rows.slice(0, 20).map((r) => ({
      id: r.lavorazioneId,
      lavorazione: r.lavorazioneId.slice(0, 8),
      stima: `${r.estimatedHours} h`,
      consuntivo: `${r.actualHours} h`,
      delta: `${r.deltaHours >= 0 ? "+" : ""}${r.deltaHours} h`,
    })) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className={reportContentPanelClass}>{trustBanner()}</div>

      <ReportSection
        id="report-analisi-ore-qualita"
        title="Qualità dati ore"
        subtitle="Integrità consuntivo, mapping addetti e anomalie"
      >
        {!payload ? (
          <p className="text-sm text-muted-foreground">Caricamento analisi ore…</p>
        ) : (
          <ReportDomainMetricsGrid metrics={qualityMetrics} />
        )}
      </ReportSection>

      {payload ? (
        <>
          <ReportSection
            id="report-analisi-ore-presenza"
            title="Presenza vs lavorazione"
            subtitle="Solo dipendenti con mapping addetto confermato"
          >
            <div className="grid gap-6 lg:grid-cols-2">
              {presenceBarPoints.length > 0 ? (
                <ReportBarChart points={presenceBarPoints} title="Ore presenza" />
              ) : null}
              {actualBarPoints.length > 0 ? (
                <ReportBarChart points={actualBarPoints} title="Ore consuntive" />
              ) : null}
            </div>
          </ReportSection>

          <ReportSection
            id="report-analisi-ore-produttivita"
            title="Classifica produttività tecnici"
            defaultCollapsed={produttivitaRows.length === 0}
          >
            <ReportDataTable configId="analisi-ore-produttivita" rows={produttivitaRows} />
          </ReportSection>

          <ReportSection
            id="report-analisi-ore-stima"
            title="Scostamento preventivo vs consuntivo"
            subtitle="Domini separati: modifica preventivo non altera il consuntivo"
            defaultCollapsed={stimaRows.length === 0}
          >
            <ReportDataTable configId="analisi-ore-stima-consuntivo" rows={stimaRows} />
          </ReportSection>

          {payload.utilization.unmappedHours > 0 ? (
            <p className="text-sm text-amber-700 dark:text-amber-400 px-1">
              {payload.utilization.unmappedHours} h escluse da KPI dipendente (addetti senza mapping:{" "}
              {payload.utilization.unmappedAddetti.join(", ") || "—"}).
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
