"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GlobalCalendarPanel, initialViewFromYmd, parseDisplayToYmd } from "@/components/gestionale/global-input/global-calendar-panel";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import {
  dateInputValueToIso,
  isoToDateInputValue,
  isoToItDisplay,
  parseItalianDayToIso,
  ymdToItDisplay,
} from "@/lib/lavorazioni/date-day-only";
import { scheduleFocusNextGestionaleField } from "@/lib/ui/gestionale-focus-navigation";
import {
  globalInputCalendarBtn,
  globalInputCalendarPortalPanel,
  globalInputFieldDefault,
  globalInputFieldFilterDate,
} from "@/lib/ui/global-input";

export type GlobalDatePickerProps = {
  /** Testo visualizzato gg/mm/aaaa (vuoto = nessuna data). */
  value: string;
  onChange: (display: string) => void;
  variant?: "default" | "filter";
  inputClassName?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
};

function fieldClassForVariant(
  variant: "default" | "filter",
  inputClassName?: string,
): string {
  if (inputClassName) return inputClassName;
  return variant === "filter" ? globalInputFieldFilterDate : `${globalInputFieldDefault} pr-11`;
}

const CALENDAR_PANEL_WIDTH_PX = 296;

export function GlobalDatePicker({
  value,
  onChange,
  variant = "default",
  inputClassName,
  id: idProp,
  required,
  disabled,
  placeholder = "gg/mm/aaaa",
  "aria-label": ariaLabel,
}: GlobalDatePickerProps) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedYmd = parseDisplayToYmd(value);
  const initial = initialViewFromYmd(selectedYmd);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  const fieldClass = fieldClassForVariant(variant, inputClassName);

  const closeCalendar = useCallback(() => setOpen(false), []);

  const { style: portalStyle, placementOriginClass } = useGlobalDropdownPortal({
    open,
    anchorRef: wrapRef,
    contentRef: panelRef,
    matchAnchorWidth: false,
    panelWidth: CALENDAR_PANEL_WIDTH_PX,
    maxHeight: 420,
    repositionDeps: [viewYear, viewMonth, selectedYmd],
  });

  useDropdownOutsideDismiss(open, wrapRef, panelRef, closeCalendar);

  useEffect(() => {
    if (!open) return;
    const v = initialViewFromYmd(selectedYmd);
    setViewYear(v.year);
    setViewMonth(v.month);
  }, [open, selectedYmd]);

  const applyYmd = useCallback(
    (ymd: string) => {
      if (!ymd) {
        onChange("");
        setOpen(false);
        return;
      }
      const r = dateInputValueToIso(ymd);
      if (r.ok) onChange(isoToItDisplay(r.iso));
      setOpen(false);
    },
    [onChange],
  );

  const onTextBlur = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      onChange("");
      return;
    }
    const r = parseItalianDayToIso(trimmed);
    if (r.ok) onChange(isoToItDisplay(r.iso));
    else onChange("");
  };

  const calendarPortal =
    open && portalStyle ? (
      <div
        ref={panelRef}
        style={{ ...portalStyle, maxHeight: "none" }}
        className={placementOriginClass}
      >
        <GlobalCalendarPanel
          panelClassName={globalInputCalendarPortalPanel}
          selectedYmd={selectedYmd}
          viewYear={viewYear}
          viewMonth={viewMonth}
          onViewChange={(y, m) => {
            setViewYear(y);
            setViewMonth(m);
          }}
          onSelectYmd={applyYmd}
        />
      </div>
    ) : null;

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={fieldClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onTextBlur}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (open) {
              setOpen(false);
            } else {
              onTextBlur();
            }
            scheduleFocusNextGestionaleField(e.currentTarget);
          }
        }}
      />
      <button
        type="button"
        className={globalInputCalendarBtn}
        aria-label="Apri calendario"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>
      {typeof document !== "undefined" && calendarPortal ? createPortal(calendarPortal, document.body) : null}
    </div>
  );
}

/** Filtri con valore interno `yyyy-mm-dd`. */
export function GlobalDatePickerYmd({
  valueYmd,
  onChangeYmd,
  id,
  placeholder = "gg/mm/aaaa",
  "aria-label": ariaLabel,
  variant = "filter",
}: {
  valueYmd: string;
  onChangeYmd: (ymd: string) => void;
  id?: string;
  placeholder?: string;
  "aria-label"?: string;
  variant?: "default" | "filter";
}) {
  const display = valueYmd ? ymdToItDisplay(valueYmd) : "";

  return (
    <GlobalDatePicker
      id={id}
      variant={variant}
      value={display}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(next) => {
        if (!next.trim()) {
          onChangeYmd("");
          return;
        }
        const r = parseItalianDayToIso(next);
        if (r.ok) onChangeYmd(isoToDateInputValue(r.iso));
      }}
    />
  );
}

/** Alias per filtri toolbar (compatibilità `LavorazioniFilterDateField`). */
export const GlobalFilterDateField = GlobalDatePickerYmd;
