"use client";

import type { ReactNode } from "react";
import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";
import {
  REPORT_PERIOD_PRESETS,
  REPORT_QUICK_PRESET_IDS,
  REPORT_PRESET_LABELS,
} from "@/lib/report/report-period-presets";
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

const PERIOD_SELECT_ITEMS = REPORT_PERIOD_PRESETS.map((p) => ({
  value: p.id,
  label: REPORT_PRESET_LABELS[p.id],
}));

const periodFieldLabelClass = `${dsTypoSmall} text-[color:var(--cab-text-muted)]`;

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
  return (
    <>
      <ToolbarGroupPrimaryRow className="items-end gap-2 sm:flex-wrap sm:justify-start sm:gap-3">
        <div className="flex min-w-0 w-full flex-1 flex-col gap-1 sm:w-auto">
          <span className={periodFieldLabelClass}>Rapidi</span>
          <div
            className={`gestionale-scrollbar ${dsSegmentedWrap} flex h-10 max-w-full items-center overflow-x-auto`}
          >
            {REPORT_QUICK_PRESET_IDS.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={preset === id}
                onClick={() => onPreset(id)}
                className={`h-8 shrink-0 ${preset === id ? dsSegmentedBtnOn : dsSegmentedBtnOff} ${dsFocus}`}
              >
                {REPORT_PRESET_LABELS[id]}
              </button>
            ))}
          </div>
        </div>
        <label
          htmlFor="report-preset-more"
          className="flex w-full min-w-0 shrink-0 flex-col gap-1 sm:w-auto sm:min-w-[10.5rem] sm:max-w-[14rem]"
        >
          <span className={periodFieldLabelClass}>Periodo</span>
          <GlobalSelect
            id="report-preset-more"
            variant="filter"
            selectOnly
            inputClassName={`${globalInputFieldFilter} h-10 w-full`}
            items={PERIOD_SELECT_ITEMS}
            value={preset}
            onChange={(v) => onPreset(v as ReportPeriodPreset)}
            strictFromList
          />
        </label>
        <label
          htmlFor="report-compare"
          className="flex w-full min-w-0 shrink-0 flex-col gap-1 sm:ml-auto sm:w-auto sm:min-w-[11.5rem]"
        >
          <span className={periodFieldLabelClass}>Confronto</span>
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

      {preset === "custom" ? (
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
          <label
            htmlFor="report-period-da"
            className={`block min-w-0 sm:max-w-[11rem] ${dsTypoSmall} text-[color:var(--cab-text)]`}
          >
            <span className={`mb-1 block ${periodFieldLabelClass}`}>Da</span>
            <GlobalDatePickerYmd id="report-period-da" valueYmd={customFrom} onChangeYmd={onCustomFrom} />
          </label>
          <label
            htmlFor="report-period-a"
            className={`block min-w-0 sm:max-w-[11rem] ${dsTypoSmall} text-[color:var(--cab-text)]`}
          >
            <span className={`mb-1 block ${periodFieldLabelClass}`}>A</span>
            <GlobalDatePickerYmd id="report-period-a" valueYmd={customTo} onChangeYmd={onCustomTo} />
          </label>
        </div>
      ) : null}

      {periodMeta ? (
        <ToolbarGroupMetaRow className="w-full !flex-wrap !justify-start gap-0">{periodMeta}</ToolbarGroupMetaRow>
      ) : null}
    </>
  );
}
