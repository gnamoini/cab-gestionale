"use client";

import type { CSSProperties } from "react";
import { GlobalFixedListPillSelect } from "@/components/gestionale/global-input/global-fixed-list-pill";
import {
  formatRicambioUnitaMisuraLabel,
  formatRicambioUnitaMisuraShort,
  RICAMBIO_UNITA_MISURA_VALUES,
  type RicambioUnitaMisura,
} from "@/lib/magazzino/ricambio-unita-misura";

const UM_PICKER_OPTIONS = RICAMBIO_UNITA_MISURA_VALUES.map((um) => ({
  value: um,
  label: formatRicambioUnitaMisuraShort(um),
}));

const umSelectedTriggerStyle: CSSProperties = {
  backgroundColor: "var(--cab-primary)",
  color: "#fff",
};

const umPickerTriggerBase =
  "min-h-10 w-full min-w-[2.75rem] rounded-none border-0 px-1.5 shadow-none text-xs font-semibold outline-none focus-visible:ring-0 focus-visible:ring-offset-0";

const umPickerStandaloneShell =
  "overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] bg-[var(--cab-surface)] shadow-[var(--cab-shadow-sm)]";

const umPickerEmbeddedWrap =
  "flex shrink-0 self-stretch min-w-[2.75rem] border-l border-[color:var(--cab-border)]";

export type RicambioUnitaMisuraPickerLayout = "embedded" | "standalone";

export function RicambioUnitaMisuraPicker({
  value,
  rowIndex,
  disabled,
  layout = "standalone",
  onChange,
}: {
  value: RicambioUnitaMisura;
  rowIndex: number;
  disabled?: boolean;
  layout?: RicambioUnitaMisuraPickerLayout;
  onChange: (unita: RicambioUnitaMisura) => void;
}) {
  const ariaLabel = `Unità di misura riga ${rowIndex + 1}`;
  const shellClass =
    layout === "embedded"
      ? `${umPickerTriggerBase} bg-transparent`
      : `${umPickerStandaloneShell} ${umPickerTriggerBase} bg-transparent`;

  const picker = (
    <GlobalFixedListPillSelect
      value={value}
      onChange={(next) => onChange(next as RicambioUnitaMisura)}
      options={UM_PICKER_OPTIONS}
      ariaLabel={ariaLabel}
      sheetTitle={formatRicambioUnitaMisuraLabel(value)}
      disabled={disabled}
      size="form"
      fallbackPillStyle={umSelectedTriggerStyle}
      shellClass={shellClass}
    />
  );

  if (layout === "embedded") {
    return <div className={umPickerEmbeddedWrap}>{picker}</div>;
  }

  return picker;
}
