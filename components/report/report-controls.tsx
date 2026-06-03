"use client";

import type { ReactNode } from "react";
import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";
import { ToolbarGroupMetaRow, ToolbarGroupPrimaryRow } from "@/components/design-system/toolbar-group";
import { GlobalDatePickerYmd, GlobalSelect } from "@/components/gestionale/global-input";
import { globalInputFieldFilter } from "@/lib/ui/global-input";
import {
  dsFocus,
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
  dsTypoSmall,
} from "@/lib/ui/design-system";

const QUICK_PRESETS: readonly { id: ReportPeriodPreset; label: string }[] = [
  { id: "today", label: "Oggi" },
  { id: "last_30_days", label: "Ultimi 30 giorni" },
  { id: "last_3_months", label: "Ultimi 3 mesi" },
  { id: "current_month", label: "Mese corrente" },
];

const MORE_PRESET_ITEMS: readonly { value: ReportPeriodPreset; label: string }[] = [
  { value: "current_week", label: "Settimana corrente" },
  { value: "last_month", label: "Ultimo mese" },
  { value: "last_12_months", label: "Ultimi 12 mesi" },
  { value: "last_3_years", label: "Ultimi 3 anni" },
  { value: "ytd", label: "Anno corrente" },
  { value: "custom", label: "Personalizzato" },
];

const QUICK_IDS = new Set(QUICK_PRESETS.map((p) => p.id));

export function ReportControls({
  preset,
  onPreset,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
  compareMode,
  onCompareMode,
  periodMeta,
}: {
  preset: ReportPeriodPreset;
  onPreset: (p: ReportPeriodPreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (s: string) => void;
  onCustomTo: (s: string) => void;
  compareMode: ReportCompareMode;
  onCompareMode: (m: ReportCompareMode) => void;
  periodMeta?: ReactNode;
}) {
  const moreSelectValue = QUICK_IDS.has(preset) ? "" : preset;

  return (
    <>
      <ToolbarGroupPrimaryRow className="items-stretch sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className={`${dsSegmentedWrap} max-w-full`}>
            {QUICK_PRESETS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={preset === id}
                onClick={() => onPreset(id)}
                className={`${preset === id ? dsSegmentedBtnOn : dsSegmentedBtnOff} ${dsFocus}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label htmlFor="report-compare" className={`flex w-full min-w-0 shrink-0 flex-col gap-1 sm:w-auto sm:min-w-[11.5rem] ${dsTypoSmall}`}>
          <span className="text-[color:var(--cab-text-muted)]">Confronto</span>
          <GlobalSelect
            id="report-compare"
            variant="filter"
            selectOnly
            inputClassName={`${globalInputFieldFilter} h-10 w-full`}
            items={[
              { value: "none", label: "Nessun confronto" },
              { value: "prev_period", label: "Periodo precedente" },
              { value: "prev_year", label: "Stesso periodo anno scorso" },
            ]}
            value={compareMode}
            onChange={(v) => onCompareMode(v as ReportCompareMode)}
            strictFromList
          />
        </label>
      </ToolbarGroupPrimaryRow>

      <div className="flex min-w-0 flex-col gap-2 border-t border-[color:var(--cab-border)] pt-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
        <label htmlFor="report-preset-more" className={`block min-w-0 flex-1 sm:max-w-[14rem] ${dsTypoSmall}`}>
          <span className="mb-1 block text-[color:var(--cab-text-muted)]">Altro periodo</span>
          <GlobalSelect
            id="report-preset-more"
            variant="filter"
            selectOnly
            inputClassName={`${globalInputFieldFilter} h-10 w-full`}
            items={[{ value: "", label: "Seleziona…" }, ...MORE_PRESET_ITEMS.map((p) => ({ value: p.value, label: p.label }))]}
            value={moreSelectValue}
            onChange={(v) => {
              if (v) onPreset(v as ReportPeriodPreset);
            }}
            strictFromList
          />
        </label>
        {preset === "custom" ? (
          <>
            <label htmlFor="report-period-da" className={`block min-w-0 sm:max-w-[11rem] ${dsTypoSmall} text-[color:var(--cab-text)]`}>
              <span className="mb-1 block text-[color:var(--cab-text-muted)]">Da</span>
              <GlobalDatePickerYmd id="report-period-da" valueYmd={customFrom} onChangeYmd={onCustomFrom} />
            </label>
            <label htmlFor="report-period-a" className={`block min-w-0 sm:max-w-[11rem] ${dsTypoSmall} text-[color:var(--cab-text)]`}>
              <span className="mb-1 block text-[color:var(--cab-text-muted)]">A</span>
              <GlobalDatePickerYmd id="report-period-a" valueYmd={customTo} onChangeYmd={onCustomTo} />
            </label>
          </>
        ) : null}
      </div>

      {periodMeta ? <ToolbarGroupMetaRow>{periodMeta}</ToolbarGroupMetaRow> : null}
    </>
  );
}
