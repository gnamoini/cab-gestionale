"use client";

import { Tooltip } from "@/components/ui";
import type { DateRange, ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";
import { inclusiveDayCount, ymdFromDate } from "@/lib/report/date-ranges";
import {
  REPORT_PRESET_LABELS,
  REPORT_QUICK_PRESET_IDS,
  reportOverflowSelectValue,
  reportPeriodPresetSelectItemsForOverflow,
  reportQuickPresetChipLabel,
} from "@/lib/report/report-period-presets";
import {
  REPORT_COMPARE_OPTIONS,
  REPORT_COMPARE_QUICK_IDS,
  reportCompareQuickChipLabel,
} from "@/lib/report/report-compare-options";
import { GlobalDatePickerYmd, GlobalSelect } from "@/components/gestionale/global-input";
import { GLOBAL_DATE_PICKER_CALENDAR_PANEL_WIDTH, globalInputFieldFilter } from "@/lib/ui/global-input";
import {
  reportPeriodPanelClass,
  reportPeriodPanelHintClass,
  reportPeriodPanelTitleClass,
  reportHealthChipClass,
} from "@/components/report/report-ui-tokens";
import {
  dsFocus,
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
  dsTypoSmall,
} from "@/lib/ui/design-system";

const OVERFLOW_SELECT_ITEMS = reportPeriodPresetSelectItemsForOverflow();
const fieldLabelClass = `${dsTypoSmall} text-[color:var(--cab-text-muted)]`;
const reportDateInputClass = `${globalInputFieldFilter} h-10 w-full min-w-0`;
function DateField({
  id,
  label,
  valueYmd,
  onChangeYmd,
}: {
  id: string;
  label: string;
  valueYmd: string;
  onChangeYmd: (ymd: string) => void;
}) {
  return (
    <label htmlFor={id} className="flex min-w-0 w-full flex-col gap-1">
      <span className={fieldLabelClass}>{label}</span>
      <GlobalDatePickerYmd
        id={id}
        valueYmd={valueYmd}
        onChangeYmd={onChangeYmd}
        inputClassName={reportDateInputClass}
        calendarPanelWidth={GLOBAL_DATE_PICKER_CALENDAR_PANEL_WIDTH}
      />
    </label>
  );
}

const dateFieldsRowClass = "grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2";
/** Righe allineate tra pannello analisi e confronto (header, date, chip, overflow). */
const periodPanelLayoutClass =
  "grid h-full min-h-0 grid-rows-[2.75rem_auto_2.75rem_4.25rem] gap-3";
const periodPanelHeaderClass = "flex min-h-11 min-w-0 items-center justify-between gap-2";
const periodPanelChipRowClass = `${dsSegmentedWrap} flex min-h-[2.75rem] min-w-0 max-w-full items-center gap-1`;

function periodChipBtnClass(active: boolean): string {
  return `inline-flex h-8 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] px-2.5 text-xs font-medium !py-0 sm:px-3 sm:text-sm ${
    active ? dsSegmentedBtnOn : dsSegmentedBtnOff
  } ${dsFocus}`;
}

export function ReportControls({
  preset,
  onPreset,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
  compareMode,
  onCompareMode,
  compareCustomFrom,
  compareCustomTo,
  onCompareCustomFrom,
  onCompareCustomTo,
  range,
  compareRange,
}: {
  preset: ReportPeriodPreset;
  onPreset: (p: ReportPeriodPreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (s: string) => void;
  onCustomTo: (s: string) => void;
  compareMode: ReportCompareMode;
  onCompareMode: (m: ReportCompareMode) => void;
  compareCustomFrom: string;
  compareCustomTo: string;
  onCompareCustomFrom: (s: string) => void;
  onCompareCustomTo: (s: string) => void;
  range: DateRange;
  compareRange: DateRange | null;
}) {
  const analysisFrom = preset === "custom" ? customFrom : ymdFromDate(range.start);
  const analysisTo = preset === "custom" ? customTo : ymdFromDate(range.end);
  const overflowValue = reportOverflowSelectValue(preset);
  const analysisDays = inclusiveDayCount(range);

  const compareActive = compareMode !== "none" && compareRange != null;
  const compareFrom =
    compareMode === "custom_range"
      ? compareCustomFrom
      : compareRange
        ? ymdFromDate(compareRange.start)
        : "";
  const compareTo =
    compareMode === "custom_range"
      ? compareCustomTo
      : compareRange
        ? ymdFromDate(compareRange.end)
        : "";
  const compareDays = compareRange ? inclusiveDayCount(compareRange) : 0;

  const pickAnalysisFrom = (ymd: string) => {
    const nextTo = preset === "custom" ? customTo : analysisTo;
    onCustomFrom(ymd);
    onCustomTo(nextTo);
    if (preset !== "custom") onPreset("custom");
  };

  const pickAnalysisTo = (ymd: string) => {
    const nextFrom = preset === "custom" ? customFrom : analysisFrom;
    onCustomFrom(nextFrom);
    onCustomTo(ymd);
    if (preset !== "custom") onPreset("custom");
  };

  const pickCompareFrom = (ymd: string) => {
    const nextTo = compareTo || ymd;
    onCompareCustomFrom(ymd);
    onCompareCustomTo(nextTo);
    onCompareMode("custom_range");
  };

  const pickCompareTo = (ymd: string) => {
    const nextFrom = compareFrom || ymd;
    onCompareCustomFrom(nextFrom);
    onCompareCustomTo(ymd);
    onCompareMode("custom_range");
  };

  return (
    <div className="grid min-w-0 items-stretch gap-3 lg:grid-cols-2" role="group" aria-label="Filtri periodo report">
      <section
        className={`${reportPeriodPanelClass} ${periodPanelLayoutClass}`}
        aria-labelledby="report-panel-analisi-title"
      >
        <div className={periodPanelHeaderClass}>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 id="report-panel-analisi-title" className={reportPeriodPanelTitleClass}>
              Periodo analisi
            </h2>
            <span className={reportHealthChipClass}>{REPORT_PRESET_LABELS[preset]}</span>
          </div>
          <span className={reportPeriodPanelHintClass}>{analysisDays} giorni</span>
        </div>

        <div className={dateFieldsRowClass}>
          <DateField id="report-period-da" label="Da" valueYmd={analysisFrom} onChangeYmd={pickAnalysisFrom} />
          <DateField id="report-period-a" label="A" valueYmd={analysisTo} onChangeYmd={pickAnalysisTo} />
        </div>

        <div className={periodPanelChipRowClass} role="group" aria-label="Scorciatoie periodo analisi">
          {REPORT_QUICK_PRESET_IDS.map((id) => (
            <Tooltip key={id} content={REPORT_PRESET_LABELS[id]}>
              <button type="button" aria-pressed={preset === id} onClick={() => onPreset(id)} className={periodChipBtnClass(preset === id)}>
                {reportQuickPresetChipLabel(id)}
              </button>
            </Tooltip>
          ))}
        </div>

        <label htmlFor="report-period-preset" className="flex min-w-0 flex-col gap-1">
          <span className={fieldLabelClass}>Altro periodo</span>
          <GlobalSelect
            id="report-period-preset"
            variant="filter"
            selectOnly
            placeholder="—"
            filterNeutralValues={[""]}
            inputClassName={`${globalInputFieldFilter} h-10 w-full`}
            items={OVERFLOW_SELECT_ITEMS}
            value={overflowValue}
            onChange={(v) => {
              if (!v) return;
              const next = v as ReportPeriodPreset;
              if (next === "custom" && preset !== "custom") {
                onCustomFrom(analysisFrom);
                onCustomTo(analysisTo);
              }
              onPreset(next);
            }}
            strictFromList
          />
        </label>
      </section>

      <section
        className={`${reportPeriodPanelClass} ${periodPanelLayoutClass}`}
        aria-labelledby="report-panel-confronto-title"
      >
        <div className={periodPanelHeaderClass}>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 id="report-panel-confronto-title" className={reportPeriodPanelTitleClass}>
              Periodo confronto
            </h2>
            <span className={`${reportHealthChipClass} invisible pointer-events-none select-none`} aria-hidden>
              {REPORT_PRESET_LABELS[preset]}
            </span>
          </div>
          <span className={reportPeriodPanelHintClass}>
            {compareActive ? `${compareDays} giorni` : "Disattivato"}
          </span>
        </div>

        <div className={dateFieldsRowClass}>
          <DateField id="report-compare-da" label="Da" valueYmd={compareFrom} onChangeYmd={pickCompareFrom} />
          <DateField id="report-compare-a" label="A" valueYmd={compareTo} onChangeYmd={pickCompareTo} />
        </div>

        <div className={periodPanelChipRowClass} role="group" aria-label="Scorciatoie periodo confronto">
          <Tooltip content={"Nessun confronto"}><button type="button" aria-pressed={compareMode === "none"} onClick={() => onCompareMode("none")} className={periodChipBtnClass(compareMode === "none")}>
            Nessuno
          </button></Tooltip>
          {REPORT_COMPARE_QUICK_IDS.map((id) => {
            const fullLabel = REPORT_COMPARE_OPTIONS.find((o) => o.value === id)?.label ?? id;
            return (
              <Tooltip key={id} content={fullLabel}>
                <button type="button" aria-pressed={compareMode === id} onClick={() => onCompareMode(id)} className={periodChipBtnClass(compareMode === id)}>
                  {reportCompareQuickChipLabel(id)}
                </button>
              </Tooltip>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-col gap-1" aria-hidden>
          <span className={`${fieldLabelClass} invisible`}>Altro periodo</span>
          <div className="h-10" />
        </div>
      </section>
    </div>
  );
}
