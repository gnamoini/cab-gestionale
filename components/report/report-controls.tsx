"use client";

import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";
import { gestionaleSelectFilterClass } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsInput, dsSurfaceCard, dsTypoSmall } from "@/lib/ui/design-system";

export function ReportControls({
  preset,
  onPreset,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
  compareMode,
  onCompareMode,
}: {
  preset: ReportPeriodPreset;
  onPreset: (p: ReportPeriodPreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (s: string) => void;
  onCustomTo: (s: string) => void;
  compareMode: ReportCompareMode;
  onCompareMode: (m: ReportCompareMode) => void;
}) {
  return (
    <div className={`${dsSurfaceCard} p-4 sm:p-5`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className={`${dsTypoSmall} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`}>
            Periodo analisi
          </span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["current_month", "Mese corrente"],
                ["last_3_months", "Ultimi 3 mesi"],
                ["last_12_months", "Ultimi 12 mesi"],
                ["ytd", "Anno corrente"],
                ["custom", "Personalizzato"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onPreset(id)}
                className={`rounded-[var(--ds-radius-lg)] px-3 py-1.5 text-sm font-medium transition ${
                  preset === id
                    ? "border border-[color:color-mix(in_srgb,var(--cab-primary)_30%,var(--cab-border))] bg-[var(--cab-primary)] text-white shadow-[var(--cab-shadow-sm)]"
                    : `border border-[color:var(--cab-border)] bg-[var(--cab-surface)] text-[color:var(--cab-text)] shadow-[var(--cab-shadow-sm)] hover:bg-[var(--cab-hover)]`
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col gap-1.5 lg:w-auto lg:min-w-[14rem]">
          <label htmlFor="report-compare" className={`${dsTypoSmall} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`}>
            Confronto periodi
          </label>
          <select
            id="report-compare"
            value={compareMode}
            onChange={(e) => onCompareMode(e.target.value as ReportCompareMode)}
            className={`${gestionaleSelectFilterClass} h-10 w-full max-w-md lg:max-w-none`}
          >
            <option value="none">Nessuno</option>
            <option value="prev_period">Periodo precedente</option>
            <option value="prev_year">Stesso periodo anno precedente</option>
          </select>
        </div>
      </div>

      {preset === "custom" ? (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-[color:var(--cab-border)] pt-4">
          <label className={`block ${dsTypoSmall} text-[color:var(--cab-text)]`}>
            Da
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFrom(e.target.value)}
              className={`${dsInput} mt-1 block max-w-[11rem]`}
            />
          </label>
          <label className={`block ${dsTypoSmall} text-[color:var(--cab-text)]`}>
            A
            <input type="date" value={customTo} onChange={(e) => onCustomTo(e.target.value)} className={`${dsInput} mt-1 block max-w-[11rem]`} />
          </label>
        </div>
      ) : null}
    </div>
  );
}
