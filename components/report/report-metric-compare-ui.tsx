"use client";

import { Tooltip } from "@/components/ui";
import type { KpiCompareRow } from "@/lib/report/build-report-model";
import type { ReportMetricCompare } from "@/lib/report/report-domain-types";
import {
  reportArrowAndTone,
  reportCompareBadgeClass,
  reportCompareToneClass,
} from "@/components/report/report-ui-tokens";

function fmtPct(p: number | null): string | null {
  if (p == null) return null;
  const s = p > 0 ? "+" : "";
  return `${s}${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

function toCompareRow(c: ReportMetricCompare): KpiCompareRow {
  const deltaAbs =
    c.deltaPct != null
      ? `${c.deltaPct > 0 ? "+" : ""}${c.deltaPct.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`
      : null;
  return { label: c.label, deltaAbs, deltaPct: c.deltaPct };
}

export function ReportMetricCompareInline({ compare }: { compare: ReportMetricCompare }) {
  const row = toCompareRow(compare);
  const pctStr = fmtPct(row.deltaPct);
  const { arrow, tone } = reportArrowAndTone(row.deltaPct);
  return (
    <Tooltip content={`${compare.label}: ${compare.value}`}><span className={reportCompareBadgeClass(tone)}>
      <span className="text-xs leading-none">{arrow}</span>
      {pctStr != null ? <span className="font-normal opacity-90">{pctStr}</span> : <span>—</span>}
    </span></Tooltip>
  );
}

export function ReportMetricCompareBlock({
  compare,
  invert,
}: {
  compare: ReportMetricCompare;
  invert?: boolean;
}) {
  const pctStr = fmtPct(compare.deltaPct);
  const { arrow, tone } = reportArrowAndTone(compare.deltaPct, invert);
  const tc = reportCompareToneClass(tone);
  return (
    <div className="mt-3 space-y-1.5 border-t border-[color:var(--cab-border)] pt-3">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs">
        <span className="font-medium text-[color:var(--cab-text-muted)]">{compare.label}</span>
        <span className="tabular-nums text-[color:var(--cab-text)]">{compare.value}</span>
      </div>
      <div className="flex min-w-0 flex-wrap items-baseline justify-end gap-x-2 text-xs">
        <span className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${tc}`}>
          <span className="text-sm leading-none">{arrow}</span>
          {pctStr != null ? <span>{pctStr}</span> : <span>—</span>}
        </span>
      </div>
    </div>
  );
}

export function ReportKpiCompareInline({ rows }: { rows: KpiCompareRow[] }) {
  const row = rows[0];
  if (!row) return null;
  const pctStr = fmtPct(row.deltaPct);
  const { arrow, tone } = reportArrowAndTone(row.deltaPct, row.invert);
  return (
    <Tooltip content={row.label}><span className={reportCompareBadgeClass(tone)}>
      <span className="text-xs leading-none">{arrow}</span>
      {row.deltaAbs != null ? <span>{row.deltaAbs}</span> : null}
      {pctStr != null ? <span className="font-normal opacity-90">{pctStr}</span> : row.deltaAbs == null ? <span>—</span> : null}
    </span></Tooltip>
  );
}

export function ReportKpiCompareBlock({ rows }: { rows: KpiCompareRow[] }) {
  return (
    <div className="mt-3 space-y-1.5 border-t border-[color:var(--cab-border)] pt-3">
      {rows.map((row) => {
        const pctStr = fmtPct(row.deltaPct);
        const { arrow, tone } = reportArrowAndTone(row.deltaPct, row.invert);
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
