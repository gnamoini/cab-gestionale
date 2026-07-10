"use client";

import { Tooltip } from "@/components/ui";
import type { KpiCompareRow } from "@/lib/report/build-report-model";
import { ReportSparkline } from "@/components/report/report-sparkline";
import {
  ReportKpiCompareBlock,
  ReportKpiCompareInline,
} from "@/components/report/report-metric-compare-ui";
import {
  reportKpiDescriptionClass,
  reportKpiTrustPillClass,
  reportMetricCardClass,
  reportMetricCardCompactClass,
  reportMetricCardHeroClass,
} from "@/components/report/report-ui-tokens";
import { REPORT_KPI_TRUST_LABELS, type ReportKpiTrust } from "@/lib/report/kpi-display-clusters";

/** Spezza sottotitoli KPI lunghi (separatori ·) in elenco leggibile. */
function KpiSubLines({ sub }: { sub: string }) {
  const parts = sub
    .split(" · ")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    return <p className="mt-2 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">{sub}</p>;
  }
  return (
    <ul className="mt-2 list-none space-y-1 p-0 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
      {parts.map((line) => (
        <li key={line} className="flex gap-1.5">
          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[color:var(--cab-text-muted)]" aria-hidden />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReportKpiCard({
  label,
  value,
  description,
  sub,
  compareRows,
  spark,
  hero = false,
  compact = false,
  trust,
  placeholder = false,
}: {
  label: string;
  value: string;
  /** Breve testo su cosa misura la metrica (sotto il titolo). */
  description?: string;
  sub?: string;
  compareRows: KpiCompareRow[] | null;
  spark?: number[];
  /** Layout più ampio in griglia, stesso stile neutro delle altre card. */
  hero?: boolean;
  compact?: boolean;
  /** Badge fiducia metrica (solo UI). */
  trust?: ReportKpiTrust;
  /** Slot futuro / disabilitato visivamente. */
  placeholder?: boolean;
}) {
  const hasCmp = compareRows != null && compareRows.length > 0;
  const shell = hero ? reportMetricCardHeroClass : compact ? reportMetricCardCompactClass : reportMetricCardClass;
  const valueSize = hero ? "text-3xl sm:text-4xl" : compact ? "text-xl" : "text-2xl sm:text-3xl";
  const showInlineCompare = hero && hasCmp;

  return (
    <article className={`${shell}${placeholder ? " pointer-events-none opacity-60" : ""}`}>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          {label}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {showInlineCompare ? <ReportKpiCompareInline rows={compareRows!} /> : null}
          {trust ? (
            <Tooltip content={`Fonte: ${REPORT_KPI_TRUST_LABELS[trust]}`}><span className={reportKpiTrustPillClass}>
              {REPORT_KPI_TRUST_LABELS[trust]}
            </span></Tooltip>
          ) : null}
        </div>
      </div>
      {description ? <p className={reportKpiDescriptionClass}>{description}</p> : null}
      <p className={`mt-2 font-semibold tracking-tight tabular-nums text-[color:var(--cab-text)] ${valueSize}`}>
        {value}
      </p>
      {sub ? <KpiSubLines sub={sub} /> : null}
      {hasCmp && !showInlineCompare ? <ReportKpiCompareBlock rows={compareRows!} /> : null}
      {spark != null ? (
        <div className="mt-auto flex min-w-0 items-end justify-between gap-2 pt-4">
          <span className="text-[10px] text-[color:var(--cab-text-muted)]">Trend 7gg (solo DB)</span>
          <ReportSparkline values={spark} className="text-[color:var(--cab-text-muted)]" />
        </div>
      ) : (
        <div className="mt-auto pt-2" />
      )}
    </article>
  );
}
