"use client";

import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { GestionaleNumericField } from "@/components/gestionale/gestionale-numeric-field";
import { GestionaleTextarea, type GestionaleTextareaProps } from "@/components/gestionale/gestionale-textarea";
import { GlobalDatePicker } from "@/components/gestionale/global-input";
import {
  insertCaptureLavorazioniBulletNewline,
  normalizeCaptureLavorazioniTextDraft,
} from "@/lib/document-capture/capture-lavorazioni-text";
import { NUMERIC_PRESETS } from "@/lib/core/numeric-input-policy";
import { dsBtnNeutral, dsInput, dsLabel } from "@/lib/ui/design-system";
import { globalInputDatePickerShellDefault } from "@/lib/ui/global-input";
import {
  formatIdentificazioneMezzoBands,
  type MezzoIdentificazioneParts,
} from "@/lib/mezzi/identificazione-mezzo";

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
  return (
    <GestionaleNumericField
      value={Number.isFinite(value) ? value : 0}
      preset={NUMERIC_PRESETS.oreLavorazione}
      onCommit={onChange}
      readOnly={readOnly}
      className={className}
      aria-label="Ore impiegate"
    />
  );
}

const SCHEDA_MEZZO_IDENT_SHELL =
  "rounded-lg border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_50%,var(--cab-card))] px-2 py-2";

const SCHEDA_MEZZO_IDENT_SHELL_INGRESSO = [
  globalInputDatePickerShellDefault,
  "flex min-h-10 min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1 px-3 py-2.5",
].join(" ");

const SCHEDA_MEZZO_IDENT_ROW_LAYOUT = "flex flex-wrap items-baseline gap-x-4 gap-y-1";

const IDENT_BAND_LABEL: Record<"cliente" | "attrezzatura" | "telaio", string> = {
  cliente: "Cliente",
  attrezzatura: "Attrezzature",
  telaio: "Telaio",
};

/** Identificazione mezzo read-only — bande sulla stessa riga; wrap per sezione (non a metà testo). */
export function SchedaMezzoIdentificazioneReadonly({
  parts,
  fallbackLine,
  shellVariant = "scheda",
  lavorazioneCodice,
}: {
  parts?: MezzoIdentificazioneParts | null;
  fallbackLine?: string;
  /** `ingresso` — stesso chrome dei campi scheda ingresso (`dsInput` / date picker). */
  shellVariant?: "scheda" | "ingresso";
  /** Riga opzionale «ID Lavorazione» subito dopo Cliente. */
  lavorazioneCodice?: string;
}) {
  const shell = shellVariant === "ingresso" ? SCHEDA_MEZZO_IDENT_SHELL_INGRESSO : SCHEDA_MEZZO_IDENT_SHELL;
  const bandTextClass =
    shellVariant === "ingresso"
      ? "min-w-0 max-w-full shrink-0 text-sm leading-snug"
      : "min-w-0 max-w-full shrink-0 text-xs leading-snug";
  const codice = lavorazioneCodice?.trim() ?? "";
  const bands = parts ? formatIdentificazioneMezzoBands(parts) : [];

  type DisplayRow = { key: string; label: string; line: string };
  const labelClass =
    shellVariant === "ingresso"
      ? "font-medium text-[color:var(--cab-text-muted)]"
      : "font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]";

  const rows: DisplayRow[] = bands.map((band) => ({
    key: band.id,
    label: IDENT_BAND_LABEL[band.id],
    line: band.line,
  }));
  if (codice) {
    const clienteIdx = rows.findIndex((row) => row.key === "cliente");
    const idRow: DisplayRow = { key: "lavorazione-codice", label: "ID Lavorazione", line: codice };
    if (clienteIdx < 0) rows.unshift(idRow);
    else rows.splice(clienteIdx + 1, 0, idRow);
  }

  if (rows.length === 0) {
    const line = fallbackLine?.trim() || "";
    if (!line || line === "—") return null;
    return (
      <p
        className={`${shell} font-medium text-[color:var(--cab-text)] ${shellVariant === "ingresso" ? "text-sm leading-snug" : "text-xs leading-snug"}`}
        role="status"
      >
        {line}
      </p>
    );
  }

  return (
    <div
      className={`${shell} ${shellVariant === "ingresso" ? "" : SCHEDA_MEZZO_IDENT_ROW_LAYOUT}`}
      role="status"
    >
      {rows.map((row) => (
        <p key={row.key} className={bandTextClass}>
          <span className={labelClass}>{row.label}</span>
          <span className="mx-1.5 text-[color:var(--cab-text-muted)]" aria-hidden>
            ·
          </span>
          <span className="font-medium text-[color:var(--cab-text)]">{row.line}</span>
        </p>
      ))}
    </div>
  );
}
