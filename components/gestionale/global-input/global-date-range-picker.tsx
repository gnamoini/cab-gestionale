"use client";

import { GlobalDatePickerYmd } from "@/components/gestionale/global-input/global-date-picker";

export function GlobalDateRangePicker({
  fromYmd,
  toYmd,
  onChangeFrom,
  onChangeTo,
  fromLabel = "Da",
  toLabel = "A",
  fromAriaLabel = "Data da",
  toAriaLabel = "Data a",
}: {
  fromYmd: string;
  toYmd: string;
  onChangeFrom: (ymd: string) => void;
  onChangeTo: (ymd: string) => void;
  fromLabel?: string;
  toLabel?: string;
  fromAriaLabel?: string;
  toAriaLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {fromLabel}
        <GlobalDatePickerYmd valueYmd={fromYmd} onChangeYmd={onChangeFrom} aria-label={fromAriaLabel} />
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {toLabel}
        <GlobalDatePickerYmd valueYmd={toYmd} onChangeYmd={onChangeTo} aria-label={toAriaLabel} />
      </label>
    </div>
  );
}
