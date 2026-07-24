"use client";

import { useCallback, useEffect, useState } from "react";
import {
  commitNumericDraft,
  resolveCommittedNumber,
} from "@/lib/core/numeric-input-commit";
import { NUMERIC_PRESETS } from "@/lib/core/numeric-input-policy";
import { isDecimalInputDraft } from "@/lib/core/decimal-input";
import { BULK_QUANTITY_MAX } from "@/lib/inventory-labels/client/label-selection";

const labelQtyPreset = NUMERIC_PRESETS.labelQty;

export function MagazzinoLabelQtyStepper({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: number;
  onChange: (qty: number) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = useCallback(() => {
    const result = commitNumericDraft(draft, labelQtyPreset, value);
    const next = resolveCommittedNumber(result, value);
    const clamped = Math.max(0, Math.min(BULK_QUANTITY_MAX, next));
    onChange(clamped);
    setDraft(String(clamped));
  }, [draft, onChange, value]);

  return (
    <div
      className="inline-flex min-h-9 items-center rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)]"
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className="inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-l-lg text-sm font-semibold text-[color:var(--cab-text)] hover:bg-[color:var(--cab-hover)] disabled:opacity-40"
        disabled={disabled || value <= 0}
        aria-label={`Diminuisci ${ariaLabel}`}
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="h-9 w-10 border-x border-[color:var(--cab-border)] bg-transparent text-center text-sm font-semibold tabular-nums text-[color:var(--cab-text)] outline-none"
        value={draft}
        disabled={disabled}
        aria-label={`Quantità ${ariaLabel}`}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d]/g, "");
          if (!isDecimalInputDraft(next, { allowNegative: false })) return;
          setDraft(next);
        }}
        onBlur={commitDraft}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitDraft();
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      <button
        type="button"
        className="inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-r-lg text-sm font-semibold text-[color:var(--cab-text)] hover:bg-[color:var(--cab-hover)] disabled:opacity-40"
        disabled={disabled || value >= BULK_QUANTITY_MAX}
        aria-label={`Aumenta ${ariaLabel}`}
        onClick={() => onChange(Math.min(BULK_QUANTITY_MAX, value + 1))}
      >
        +
      </button>
    </div>
  );
}
