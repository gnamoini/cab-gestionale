"use client";

import { AddettoSelectField } from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import { GlobalSelect } from "@/components/gestionale/global-input/global-select";
import { gestionaleFilterFieldInputClass } from "@/components/gestionale/lavorazioni/lavorazioni-filter-fields";
import { useAddettiPickerOptions, type AddettiPickerMode } from "@/src/hooks/gestionale/use-addetti-picker-options";
import type { FixedListPillOption, FixedListPillSelectLayout, FixedListPillSelectSize } from "@/components/gestionale/global-input/global-fixed-list-pill";

export type AddettoPickerProps = {
  value: string | null;
  onChange: (addettoId: string) => void;
  variant?: "pill" | "filter";
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  size?: FixedListPillSelectSize;
  tablePillWidth?: string;
  allowEmpty?: boolean;
  emptyValue?: string;
  /** SSOT opzioni quando il parent ha già `GlobalOptionsSlice` (es. capture / modale scheda). */
  options?: readonly FixedListPillOption[];
  /** `inline` = tutte le pill visibili (pochi addetti). */
  layout?: FixedListPillSelectLayout;
  placeholder?: string;
  /** `addetti` = solo addetti operativi; `all` = tutti i dipendenti attivi. */
  mode?: AddettiPickerMode;
};

const FILTER_ALL = "__tutti__";

export function AddettoPicker({
  value,
  onChange,
  variant = "pill",
  ariaLabel,
  disabled,
  className = "",
  inputClassName,
  size = "compact",
  tablePillWidth,
  allowEmpty = false,
  emptyValue = "",
  options: optionsProp,
  layout,
  placeholder,
  mode = "addetti",
}: AddettoPickerProps) {
  const { options: hookOptions } = useAddettiPickerOptions(optionsProp ? null : value, mode);
  const options = optionsProp ?? hookOptions;
  const selectValue = value?.trim() || (allowEmpty ? emptyValue : "");

  if (variant === "filter") {
    const items = [
      { value: FILTER_ALL, label: "Tutti gli addetti" },
      ...options.map((o) => ({ value: o.value, label: o.label, pillStyle: o.pillStyle })),
    ];
    return (
      <GlobalSelect
        items={items}
        value={selectValue || FILTER_ALL}
        onChange={(v) => onChange(v === FILTER_ALL ? "" : v)}
        inputClassName={inputClassName ?? gestionaleFilterFieldInputClass}
        strictFromList
        selectOnly
        variant="filter"
        filterNeutralValues={[FILTER_ALL]}
        preserveItemOrder
        alphabeticalBrowse={false}
        selectorDomain="addetti"
        dynamicList
        operationalFilter
        coloredOptions
        aria-label={ariaLabel}
        disabled={disabled}
        className={className}
      />
    );
  }

  return (
    <AddettoSelectField
      value={selectValue}
      onChange={onChange}
      options={options}
      ariaLabel={ariaLabel}
      disabled={disabled}
      className={className}
      inputClassName={inputClassName}
      size={size}
      tablePillWidth={tablePillWidth}
      layout={layout}
      placeholder={placeholder}
    />
  );
}

export { FILTER_ALL as ADDETTO_FILTER_ALL };
