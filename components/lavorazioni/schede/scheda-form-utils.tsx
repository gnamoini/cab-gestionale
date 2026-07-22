"use client";

import { useEffect, useState } from "react";
import { GlobalDatePicker } from "@/components/gestionale/global-input";
import { dsBtnNeutral, dsInput, dsLabel } from "@/lib/ui/design-system";

export function todayItDate(): string {
  return new Date().toLocaleDateString("it-IT");
}

export function normalizeOreText(raw: string): string {
  const t = raw.trim().replace(",", ".");
  if (!t) return "";
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n < 0) return "";
  return String(Math.round(n * 1000) / 1000);
}

export function SchedaDayField({
  label,
  value,
  onChange,
  readOnly,
  showLabel = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  showLabel?: boolean;
}) {
  if (readOnly) {
    return (
      <label className="block text-xs">
        {showLabel ? <span className={dsLabel}>{label}</span> : null}
        <input className={`${dsInput} mt-1`} readOnly value={value} />
      </label>
    );
  }
  return (
    <div className="block text-xs">
      {showLabel ? <span className={dsLabel}>{label}</span> : null}
      <div className={`flex flex-nowrap items-stretch gap-2 sm:flex-wrap ${showLabel ? "mt-1" : ""}`}>
        <div className="min-w-0 flex-1">
          <GlobalDatePicker
            value={value}
            onChange={onChange}
            inputClassName={`${dsInput} !py-1.5 !text-xs`}
            placeholder="GG/MM/AAAA"
            aria-label={label}
          />
        </div>
        <button type="button" className={`${dsBtnNeutral} shrink-0 self-end`} onClick={() => onChange(todayItDate())}>
          Oggi
        </button>
      </div>
    </div>
  );
}

export function SchedaOreNumberInput({
  value,
  onChange,
  readOnly = false,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  readOnly?: boolean;
  className?: string;
}) {
  const [text, setText] = useState(() => (Number.isFinite(value) ? String(value) : "0"));
  useEffect(() => {
    setText(Number.isFinite(value) ? String(value) : "0");
  }, [value]);
  return (
    <input
      type="number"
      step={1}
      min={0}
      inputMode="decimal"
      readOnly={readOnly}
      className={className}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number.parseFloat(e.target.value.replace(",", "."));
        if (Number.isFinite(n) && n >= 0) onChange(Math.round(n * 1000) / 1000);
      }}
      onBlur={() => {
        const n = Number.parseFloat(text.replace(",", "."));
        const next = Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) / 1000 : 0;
        setText(String(next));
        onChange(next);
      }}
    />
  );
}
