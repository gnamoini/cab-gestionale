"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { GestionaleTextarea, type GestionaleTextareaProps } from "@/components/gestionale/gestionale-textarea";
import { GlobalDatePicker } from "@/components/gestionale/global-input";
import {
  insertCaptureLavorazioniBulletNewline,
  normalizeCaptureLavorazioniTextDraft,
} from "@/lib/document-capture/capture-lavorazioni-text";
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
  showTodayButton = true,
  compact = false,
  className = "",
  inputClassName,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  showLabel?: boolean;
  showTodayButton?: boolean;
  compact?: boolean;
  className?: string;
  inputClassName?: string;
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
    <div className={`block text-xs ${compact ? "" : ""} ${className}`.trim()}>
      {showLabel ? <span className={dsLabel}>{label}</span> : null}
      <div
        className={
          showTodayButton
            ? `flex flex-nowrap items-stretch gap-2 sm:flex-wrap ${showLabel ? "mt-1" : ""}`
            : showLabel
              ? "mt-1"
              : ""
        }
      >
        <div className={compact ? "w-full" : "min-w-0 flex-1"}>
          <GlobalDatePicker
            value={value}
            onChange={onChange}
            inputClassName={inputClassName ?? `${dsInput} !w-full !py-1.5 !text-xs`}
            placeholder="GG/MM/AAAA"
            aria-label={label}
          />
        </div>
        {showTodayButton ? (
          <button type="button" className={`${dsBtnNeutral} shrink-0 self-end`} onClick={() => onChange(todayItDate())}>
            Oggi
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SchedaLavorazioniEffettuateTextarea({
  value,
  onChange,
  readOnly,
  ...rest
}: Omit<GestionaleTextareaProps, "onChange" | "readOnly"> & {
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorRef = useRef<number | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (readOnly || e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? start;
      const { value: next, cursor } = insertCaptureLavorazioniBulletNewline(value, start, end);
      cursorRef.current = cursor;
      onChange(next);
    },
    [onChange, readOnly, value],
  );

  const handleBlur = useCallback(() => {
    if (readOnly) return;
    const normalized = normalizeCaptureLavorazioniTextDraft(value);
    if (normalized !== value) onChange(normalized);
  }, [onChange, readOnly, value]);

  useLayoutEffect(() => {
    if (cursorRef.current === null || !textareaRef.current) return;
    const pos = cursorRef.current;
    cursorRef.current = null;
    textareaRef.current.setSelectionRange(pos, pos);
  }, [value]);

  return (
    <GestionaleTextarea
      {...rest}
      ref={textareaRef}
      readOnly={readOnly}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
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
