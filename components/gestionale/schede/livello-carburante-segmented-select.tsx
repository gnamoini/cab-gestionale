"use client";

import { LIVELLO_CARBURANTE_OPTIONS } from "@/lib/schede/livello-carburante-options";
import { dsFocus, dsSegmentedBtnOff, dsSegmentedBtnOn, dsSegmentedWrap } from "@/lib/ui/design-system";

const wrapClass = `${dsSegmentedWrap} w-full min-w-0 gap-0.5 p-0.5`;
const btnOn = `${dsSegmentedBtnOn} min-w-0 flex-1 px-1.5 py-2 text-xs max-sm:min-h-11 sm:px-2 sm:text-sm`;
const btnOff = `${dsSegmentedBtnOff} min-w-0 flex-1 px-1.5 py-2 text-xs max-sm:min-h-11 sm:px-2 sm:text-sm`;

export function LivelloCarburanteSegmentedSelect({
  id,
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel = "Livello carburante",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <div id={id} className={wrapClass} role="group" aria-label={ariaLabel}>
      {LIVELLO_CARBURANTE_OPTIONS.map((level) => {
        const active = value === level;
        return (
          <button
            key={level}
            type="button"
            className={`${active ? btnOn : btnOff} ${dsFocus}`}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(active ? "" : level)}
          >
            {level}
          </button>
        );
      })}
    </div>
  );
}
