"use client";

import type { ReportMetricCompareState } from "@/lib/report/metrics/report-metric-types";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import { formatReportMetricValue } from "@/lib/report/metrics/format-report-metric-value";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { metricTrendToneClass, resolveMetricTrendTone } from "@/lib/report/metrics/resolve-metric-trend-tone";
import { ReportTrustBadge } from "@/components/report/bi-center/report-trust-badge";

function fmtPct(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return "—";
  const s = p > 0 ? "+" : "";
  return `${s}${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

export function ReportMetricDeltaRow({
  envelope,
}: {
  envelope: ReportMetricEnvelope | undefined;
}) {
  if (!envelope) return null;
  const reg = getRegistryEntry(envelope.metricId);
  if (!reg) return null;
  const compare = envelope.metric.compare as ReportMetricCompareState | null;
  const delta = compare?.status === "available" ? compare.deltaPercent : null;
  const tone = resolveMetricTrendTone(envelope.metricId, delta);
  const value =
    envelope.trust === "not_available"
      ? "—"
      : formatReportMetricValue(envelope.metric.value, reg.formatter ?? reg.unit);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[color:var(--cab-border)] px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-[color:var(--cab-text-muted)]">{reg.label}</p>
        <p className="text-sm font-semibold tabular-nums">{value}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold tabular-nums ${metricTrendToneClass(tone)}`}>{fmtPct(delta)}</span>
        <ReportTrustBadge trust={envelope.trust} />
      </div>
    </div>
  );
}

export function ReportTrustCompareFooter({
  compareLabel,
  trust,
}: {
  compareLabel?: string;
  trust?: ReportMetricEnvelope["trust"];
}) {
  if (!compareLabel && !trust) return null;
  return (
    <p className="mt-2 text-xs text-[color:var(--cab-text-muted)]">
      {compareLabel ? `Confronto: ${compareLabel}` : null}
      {trust === "partial" ? " · Dato parziale" : null}
      {trust === "estimated" ? " · Stima" : null}
    </p>
  );
}
