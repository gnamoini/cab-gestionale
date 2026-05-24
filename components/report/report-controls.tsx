"use client";

import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";
import { GlobalDatePickerYmd, GlobalSelect } from "@/components/gestionale/global-input";
import { globalInputFieldFilter } from "@/lib/ui/global-input";
import { dsSurfaceCard, dsTypoSmall } from "@/lib/ui/design-system";

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
          <GlobalSelect
            id="report-compare"
            variant="filter"
            selectOnly
            inputClassName={`${globalInputFieldFilter} h-10 max-w-md lg:max-w-none`}
            items={[
              { value: "none", label: "Nessuno" },
              { value: "prev_period", label: "Periodo precedente" },
              { value: "prev_year", label: "Stesso periodo anno precedente" },
            ]}
            value={compareMode}
            onChange={(v) => onCompareMode(v as ReportCompareMode)}
            strictFromList
            aria-label="Confronto periodi"
          />
        </div>
      </div>

      {preset === "custom" ? (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-[color:var(--cab-border)] pt-4">
          <label className={`block ${dsTypoSmall} text-[color:var(--cab-text)]`}>
            Da
            <div className="mt-1 max-w-[11rem]">
              <GlobalDatePickerYmd valueYmd={customFrom} onChangeYmd={onCustomFrom} aria-label="Periodo da" />
            </div>
          </label>
          <label className={`block ${dsTypoSmall} text-[color:var(--cab-text)]`}>
            A
            <div className="mt-1 max-w-[11rem]">
              <GlobalDatePickerYmd valueYmd={customTo} onChangeYmd={onCustomTo} aria-label="Periodo a" />
            </div>
          </label>
        </div>
      ) : null}
    </div>
  );
}
