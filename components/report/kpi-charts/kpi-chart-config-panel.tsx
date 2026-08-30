"use client";

import { getPlottableMetrics } from "@/lib/report/kpi-series/capability-matrix";
import type { KpiChartDraftConfig } from "@/components/report/kpi-charts/use-kpi-chart-series";
import { erpBtnAccent } from "@/components/report/report-buttons";
import { REPORT_PRESET_LABELS } from "@/lib/report/report-period-presets";
import type { ReportPeriodPreset } from "@/lib/report/date-ranges";

const TIMEFRAME_PRESETS: ReportPeriodPreset[] = [
  "last_7_days",
  "last_30_days",
  "current_month",
  "current_quarter",
  "custom",
];

export function KpiChartConfigPanel({
  draft,
  onChange,
  onApply,
  validationErrors,
  needsAbsoluteConfirm,
  onConfirmAbsolute,
}: {
  draft: KpiChartDraftConfig;
  onChange: (next: KpiChartDraftConfig) => void;
  onApply: () => void;
  validationErrors: string[];
  needsAbsoluteConfirm: boolean;
  onConfirmAbsolute: () => void;
}) {
  const plottable = getPlottableMetrics();

  const toggleMetric = (metricId: string) => {
    const set = new Set(draft.metricIds);
    if (set.has(metricId)) set.delete(metricId);
    else if (set.size < 5) set.add(metricId);
    onChange({ ...draft, metricIds: [...set] });
  };

  return (
    <div className="min-w-0 space-y-4 rounded-lg border border-[color:var(--cab-border)] bg-[color:var(--cab-surface)] p-4">
      <div>
        <p className="mb-2 text-sm font-medium text-[color:var(--cab-text)]">KPI (min 2, max 5)</p>
        <div className="flex gap-2 flex-nowrap sm:flex-wrap">
          {plottable.map((m) => {
            const selected = draft.metricIds.includes(m.metricId);
            return (
              <button
                key={m.metricId}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleMetric(m.metricId)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  selected
                    ? "border-[color:var(--cab-primary)] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,transparent)] text-[color:var(--cab-primary)]"
                    : "border-[color:var(--cab-border)] text-[color:var(--cab-text)] hover:border-[color:var(--cab-primary)]"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[color:var(--cab-text)]">Periodo grafico</p>
        <div className="flex gap-2 flex-nowrap sm:flex-wrap">
          {TIMEFRAME_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={draft.preset === preset}
              onClick={() => onChange({ ...draft, preset })}
              className={`rounded-full border px-3 py-1 text-sm ${
                draft.preset === preset
                  ? "border-[color:var(--cab-primary)] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,transparent)]"
                  : "border-[color:var(--cab-border)]"
              }`}
            >
              {REPORT_PRESET_LABELS[preset] ?? preset}
            </button>
          ))}
        </div>
        {draft.preset === "custom" ? (
          <div className="mt-2 flex items-center gap-2 flex-nowrap sm:flex-wrap">
            <label className="text-sm text-[color:var(--cab-text-muted)]">
              Da
              <input
                type="date"
                value={draft.customFrom}
                onChange={(e) => onChange({ ...draft, customFrom: e.target.value })}
                className="ml-2 rounded border border-[color:var(--cab-border)] bg-transparent px-2 py-1 text-sm"
              />
            </label>
            <label className="text-sm text-[color:var(--cab-text-muted)]">
              A
              <input
                type="date"
                value={draft.customTo}
                onChange={(e) => onChange({ ...draft, customTo: e.target.value })}
                className="ml-2 rounded border border-[color:var(--cab-border)] bg-transparent px-2 py-1 text-sm"
              />
            </label>
          </div>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[color:var(--cab-text)]">Visualizzazione</p>
        <div className="flex gap-2 flex-nowrap sm:flex-wrap">
          <button
            type="button"
            aria-pressed={draft.displayMode === "indexed"}
            onClick={() => onChange({ ...draft, displayMode: "indexed", absoluteConfirmed: false })}
            className={`rounded-full border px-3 py-1 text-sm ${
              draft.displayMode === "indexed"
                ? "border-[color:var(--cab-primary)] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,transparent)]"
                : "border-[color:var(--cab-border)]"
            }`}
          >
            Indice (100)
          </button>
          <button
            type="button"
            aria-pressed={draft.displayMode === "absolute"}
            onClick={() => onChange({ ...draft, displayMode: "absolute", absoluteConfirmed: false })}
            className={`rounded-full border px-3 py-1 text-sm ${
              draft.displayMode === "absolute"
                ? "border-[color:var(--cab-primary)] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,transparent)]"
                : "border-[color:var(--cab-border)]"
            }`}
          >
            Valori assoluti
          </button>
        </div>
        {draft.displayMode === "absolute" ? (
          <p className="mt-2 text-xs text-[color:var(--cab-text-muted)]">
            Attenzione: confrontare unità diverse su assi separati può suggerire correlazioni spurie.
          </p>
        ) : null}
      </div>

      {validationErrors.length > 0 ? (
        <ul className="text-sm text-[color:var(--cab-danger)]">
          {validationErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2 flex-nowrap sm:flex-wrap">
        {needsAbsoluteConfirm ? (
          <button type="button" className={erpBtnAccent} onClick={onConfirmAbsolute}>
            Conferma valori assoluti
          </button>
        ) : (
          <button type="button" className={erpBtnAccent} onClick={onApply}>
            Applica
          </button>
        )}
      </div>
    </div>
  );
}
