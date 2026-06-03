"use client";

import type { KpiCompareRow } from "@/lib/report/build-report-model";
import { ReportSparkline } from "@/components/report/report-sparkline";
import {
  reportCompareToneClass,
  reportKpiDescriptionClass,
  reportKpiTrustPillClass,
  reportMetricCardClass,
  reportMetricCardCompactClass,
  type ReportCompareTone,
} from "@/components/report/report-ui-tokens";
import { REPORT_KPI_TRUST_LABELS, type ReportKpiTrust } from "@/lib/report/kpi-display-clusters";

function fmtPct(p: number | null): string | null {
  if (p == null) return null;
  const s = p > 0 ? "+" : "";
  return `${s}${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

function arrowAndTone(
  deltaPct: number | null,
  invert: boolean | undefined,
): { arrow: string; tone: ReportCompareTone } {
  if (deltaPct == null || !Number.isFinite(deltaPct)) return { arrow: "→", tone: "flat" };
  if (deltaPct === 0) return { arrow: "→", tone: "flat" };
  if (invert) {
    if (deltaPct < 0) return { arrow: "↑", tone: "up" };
    return { arrow: "↓", tone: "down" };
  }
  if (deltaPct > 0) return { arrow: "↑", tone: "up" };
  return { arrow: "↓", tone: "down" };
}

function CompareBlock({ rows }: { rows: KpiCompareRow[] }) {
  return (
    <div className="mt-3 space-y-1.5 border-t border-[color:var(--cab-border)] pt-3">
      {rows.map((row) => {
        const pctStr = fmtPct(row.deltaPct);
        const { arrow, tone } = arrowAndTone(row.deltaPct, row.invert);
        const tc = reportCompareToneClass(tone);
        return (
          <div key={row.label} className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs">
            <span className="font-medium text-[color:var(--cab-text-muted)]">{row.label}</span>
            <span className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${tc}`}>
              <span className="text-sm leading-none">{arrow}</span>
              <span>
                {row.deltaAbs != null ? <span>{row.deltaAbs}</span> : null}
                {row.deltaAbs != null && pctStr != null ? (
                  <span className="font-normal text-[color:var(--cab-text-muted)]"> · </span>
                ) : null}
                {pctStr != null ? <span>{pctStr}</span> : row.deltaAbs == null ? <span>—</span> : null}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

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
  const shell = compact ? reportMetricCardCompactClass : reportMetricCardClass;
  const valueSize = hero ? "text-3xl sm:text-4xl" : compact ? "text-xl" : "text-2xl sm:text-3xl";

  return (
    <article className={`${shell}${placeholder ? " pointer-events-none opacity-60" : ""}`}>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          {label}
        </p>
        {trust ? (
          <span className={reportKpiTrustPillClass} title={`Fonte: ${REPORT_KPI_TRUST_LABELS[trust]}`}>
            {REPORT_KPI_TRUST_LABELS[trust]}
          </span>
        ) : null}
      </div>
      {description ? <p className={reportKpiDescriptionClass}>{description}</p> : null}
      <p className={`mt-2 font-semibold tracking-tight tabular-nums text-[color:var(--cab-text)] ${valueSize}`}>
        {value}
      </p>
      {sub ? <KpiSubLines sub={sub} /> : null}
      {hasCmp ? <CompareBlock rows={compareRows!} /> : null}
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
