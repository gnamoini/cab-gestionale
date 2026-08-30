"use client";

import { useMemo, useState } from "react";
import { ReportBarChart, ReportDataTable, ReportSection } from "@/components/report/design-system";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { auditDataQuality } from "@/lib/report/recidivita/data-quality-audit";
import {
  buildFleetRecidivitaKpi,
  countIngressiByMonth,
  listRecidivaMezziRanked,
} from "@/lib/report/recidivita/recidivita-selectors";
import { buildQualitaInterventiByOperatore } from "@/lib/report/recidivita/qualita-interventi";
import type { RecidivitaWindowDays } from "@/lib/report/recidivita/types";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { parseAddettiRecordsFromPayload } from "@/lib/lavorazioni/addetto-model";
import { dsTableWrap } from "@/lib/ui/design-system";

export type ReportRecidivitaFiltersState = {
  clienteQ: string;
  modelloQ: string;
  operatoreQ: string;
  windowDays: RecidivitaWindowDays;
};

const DEFAULT_FILTERS: ReportRecidivitaFiltersState = {
  clienteQ: "",
  modelloQ: "",
  operatoreQ: "",
  windowDays: 30,
};

function filterCompletate(
  completate: DomainReportSectionProps["completate"],
  filters: ReportRecidivitaFiltersState,
) {
  const cq = filters.clienteQ.trim().toLowerCase();
  const mq = filters.modelloQ.trim().toLowerCase();
  return completate.filter((c) => {
    if (cq && !c.cliente.toLowerCase().includes(cq)) return false;
    if (mq && !c.macchina.toLowerCase().includes(mq)) return false;
    return true;
  });
}

export default function ReportRecidivitaMezziSectionView(props: DomainReportSectionProps) {
  const settingsQ = useCabAppSettingsPayloadQuery({ tier: "static" });
  const [filters, setFilters] = useState<ReportRecidivitaFiltersState>(DEFAULT_FILTERS);

  const addettiRecords = useMemo(() => {
    const raw = settingsQ.data?.resolved?.lavorazioni.addettiRecords;
    return parseAddettiRecordsFromPayload(raw) ?? [];
  }, [settingsQ.data]);

  const filteredCompletate = useMemo(
    () => filterCompletate(props.completate, filters),
    [props.completate, filters],
  );

  const selectorInput = useMemo(
    () => ({
      completate: filteredCompletate,
      range: props.range,
      windowDays: filters.windowDays,
      schedeStore: props.schedeStore,
      movimenti: props.lavListRows.flatMap(() => []),
      magazzinoRows: props.magazzinoRows,
      addettiRecords,
    }),
    [
      filteredCompletate,
      props.range,
      filters.windowDays,
      props.schedeStore,
      props.magazzinoRows,
      props.lavListRows,
      addettiRecords,
    ],
  );

  const dataQuality = useMemo(
    () =>
      auditDataQuality({
        lavRows: props.lavListRows,
        schedeStore: props.schedeStore,
        movimenti: [],
        addettiRecords,
      }),
    [props.lavListRows, props.schedeStore, addettiRecords],
  );

  const fleetKpi = useMemo(() => buildFleetRecidivitaKpi(selectorInput), [selectorInput]);
  const ranked = useMemo(() => listRecidivaMezziRanked(selectorInput, 10), [selectorInput]);
  const ingressiChart = useMemo(
    () => countIngressiByMonth(filteredCompletate, props.range),
    [filteredCompletate, props.range],
  );

  const qualitaOperatore = useMemo(
    () =>
      buildQualitaInterventiByOperatore({
        completate: filteredCompletate,
        windowDays: filters.windowDays,
        schedeStore: props.schedeStore,
        addettiRecords,
      }),
    [filteredCompletate, filters.windowDays, props.schedeStore, addettiRecords],
  );

  const rankedRows = ranked.map((r, i) => ({
    id: r.mezzoId,
    rank: i + 1,
    mezzo: r.mezzo,
    cliente: r.cliente,
    interventi: r.interventi,
    ritorni: r.ritorni,
    recidivitaScore: Math.round(r.recidivitaScore * 100),
    ultimoIntervento: r.ultimoIntervento,
  }));

  const qualitaRows = qualitaOperatore.map((r) => ({
    id: r.segmentKey,
    ...r,
  }));

  return (
    <ReportSection
      id="recidivita_mezzi"
      title="ANALISI RECIDIVITÀ MEZZI"
      subtitle="Pattern di ritorno in officina, score multi-livello e correlazioni qualitative"
    >
      {dataQuality.warnings.length > 0 ? (
        <div className="mb-4 rounded-[var(--ds-radius-lg)] border border-amber-300/70 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">Affidabilità dati — verificare prima di interpretare i risultati</p>
          <ul className="mt-1 list-inside list-disc">
            {dataQuality.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Mezzi analizzati" value={String(fleetKpi.mezziAnalizzati)} />
        <KpiCard label="Ingressi totali" value={String(fleetKpi.ingressiTotali)} />
        <KpiCard label={`Ritorni < ${filters.windowDays} gg`} value={String(fleetKpi.ritorniWindow)} />
        <KpiCard label="Indice recidività" value={`${fleetKpi.indiceRecidivitaPct}%`} />
        <KpiCard label="Costo ritorni (stima)" value={`${fleetKpi.costoRitorni.toLocaleString("it-IT")} €`} />
        <KpiCard label="Ore perse (stima)" value={`${fleetKpi.orePerse} h`} />
        <KpiCard
          label="Precisione operatori"
          value={`${fleetKpi.operatorAttributionPrecisionPct}%`}
        />
        <KpiCard
          label="Schede ingresso mancanti"
          value={`${dataQuality.withoutIngressoSchedaPct}%`}
        />
      </div>

      <RecidivitaFilters filters={filters} onChange={setFilters} />

      <div className="mt-6 space-y-8">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-[color:var(--cab-text)]">Top 10 mezzi critici</h3>
          <ReportDataTable configId="recidiva-mezzi" rows={rankedRows} />
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-[color:var(--cab-text)]">Ingressi nel tempo</h3>
          <ReportBarChart points={ingressiChart} />
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-[color:var(--cab-text)]">
            Correlazione qualità interventi — operatori
          </h3>
          <p className="mb-3 text-xs text-[color:var(--cab-text-muted)]">
            Indicatore esplorativo contestualizzato (complessità intervento, campione minimo). Non è una
            valutazione individuale di performance.
          </p>
          <ReportDataTable configId="qualita-interventi" rows={qualitaRows} />
        </section>
      </div>
    </ReportSection>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-card)] px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-[color:var(--cab-text)]">{value}</p>
    </div>
  );
}

function RecidivitaFilters({
  filters,
  onChange,
}: {
  filters: ReportRecidivitaFiltersState;
  onChange: (f: ReportRecidivitaFiltersState) => void;
}) {
  return (
    <div className={`${dsTableWrap} grid gap-3 sm:grid-cols-2 lg:grid-cols-4`}>
      <label className="block text-xs">
        <span className="text-[color:var(--cab-text-muted)]">Cliente</span>
        <input
          className="mt-1 w-full rounded border border-[color:var(--cab-border)] bg-[color:var(--cab-card)] px-2 py-1.5 text-sm"
          value={filters.clienteQ}
          onChange={(e) => onChange({ ...filters, clienteQ: e.target.value })}
        />
      </label>
      <label className="block text-xs">
        <span className="text-[color:var(--cab-text-muted)]">Modello / macchina</span>
        <input
          className="mt-1 w-full rounded border border-[color:var(--cab-border)] bg-[color:var(--cab-card)] px-2 py-1.5 text-sm"
          value={filters.modelloQ}
          onChange={(e) => onChange({ ...filters, modelloQ: e.target.value })}
        />
      </label>
      <label className="block text-xs">
        <span className="text-[color:var(--cab-text-muted)]">Finestra recidività</span>
        <select
          className="mt-1 w-full rounded border border-[color:var(--cab-border)] bg-[color:var(--cab-card)] px-2 py-1.5 text-sm"
          value={filters.windowDays}
          onChange={(e) =>
            onChange({ ...filters, windowDays: Number(e.target.value) as RecidivitaWindowDays })
          }
        >
          <option value={30}>30 giorni</option>
          <option value={90}>90 giorni</option>
          <option value={365}>12 mesi</option>
        </select>
      </label>
    </div>
  );
}
