"use client";

import { useCallback, useEffect, useState } from "react";
import { BULK_QUANTITY_MAX } from "@/lib/inventory-labels/client/label-selection";

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
    const trimmed = draft.trim();
    if (!trimmed) {
      onChange(0);
      setDraft("0");
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(0, Math.min(BULK_QUANTITY_MAX, Math.floor(parsed)));
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
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
        onBlur={commitDraft}
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
