"use client";

import type { ReactNode } from "react";

type Option = { value: string; label: string };

type Props = {
  label?: string;
  value: string;
  options: Option[];
  disabled?: boolean;
  onChange: (value: string) => void;
  footer?: ReactNode;
};

/** Presentation primitive for entity/candidate matching in capture review surfaces. */
export function EntityMatcher({ label, value, options, disabled, onChange, footer }: Props) {
  return (
    <div className="space-y-1">
      {label ? <span className="sr-only">{label}</span> : null}
      <select
        className="w-full max-w-[12rem] rounded border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-1 py-0.5 text-xs"
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {footer}
    </div>
  );
}
