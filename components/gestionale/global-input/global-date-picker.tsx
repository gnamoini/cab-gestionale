"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type Ref,
} from "react";
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
  ymdToItDisplay,
} from "@/lib/lavorazioni/date-day-only";
import { scheduleFocusNextGestionaleField } from "@/lib/ui/gestionale-focus-navigation";
import {
  applyItalianDateMaskChange,
  applyItalianDateBackspace,
  applyItalianDateForwardDelete,
  normalizeItalianDatePaste,
  parseItalianDayDisplayToIso,
  validateItalianDateInput,
  type ItalianDateYearRange,
} from "@/lib/ui/italian-date-input-mask";
import {
  extractDatePickerShellLayoutClass,
  GLOBAL_DATE_PICKER_CALENDAR_PANEL_WIDTH,
  globalInputCalendarPortalPanel,
  globalInputDatePickerCalendarBtn,
  globalInputDatePickerInput,
  globalInputDatePickerShellDefault,
  globalInputDatePickerShellFilter,
  globalInputInvalidMessage,
  globalInputInvalidRing,
  stripDatePickerFieldChrome,
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
  /** Ref sull'input testo (focus iniziale modali). */
  inputRef?: Ref<HTMLInputElement>;
  /** Se impostato, sostituisce la normalizzazione predefinita su blur. */
  onBlur?: () => void;
  /** Range anno per feedback UX (default 1900–2100). */
  yearRange?: ItalianDateYearRange;
  /** Larghezza fissa popup calendario (evita schiacciamento se l'anchor è stretto). */
  calendarPanelWidth?: number;
};

function shellClassForVariant(variant: "default" | "filter"): string {
  return variant === "filter" ? globalInputDatePickerShellFilter : globalInputDatePickerShellDefault;
}

function inputSegmentClassForVariant(
  variant: "default" | "filter",
  inputClassName?: string,
): string {
  const base =
    variant === "default" ? `${globalInputDatePickerInput} py-2.5` : globalInputDatePickerInput;
  if (!inputClassName?.trim()) return base;
  const extra = stripDatePickerFieldChrome(inputClassName);
  return extra ? `${base} ${extra}` : base;
}

function shellLayoutClassFromInput(inputClassName?: string): string {
  if (!inputClassName?.trim()) return "";
  return extractDatePickerShellLayoutClass(inputClassName);
}

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
  inputRef: inputRefProp,
  onBlur: onBlurProp,
  yearRange,
  calendarPanelWidth,
}: GlobalDatePickerProps) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const errorId = `${inputId}-date-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCursor = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedYmd = parseDisplayToYmd(value);
  const initial = initialViewFromYmd(selectedYmd);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  const validation = useMemo(
    () => validateItalianDateInput(value, { yearRange }),
    [value, yearRange],
  );
  const showInvalid = validation.status === "invalid" && value.trim().length > 0;

  const shellClass = shellClassForVariant(variant);
  const shellLayoutClass = shellLayoutClassFromInput(inputClassName);
  const inputClass = inputSegmentClassForVariant(variant, inputClassName);
  const shellCombined = showInvalid
    ? `${shellClass}${shellLayoutClass ? ` ${shellLayoutClass}` : ""}${globalInputInvalidRing}`
    : `${shellClass}${shellLayoutClass ? ` ${shellLayoutClass}` : ""}`;

  const closeCalendar = useCallback(() => setOpen(false), []);

  const resolvedCalendarPanelWidth = calendarPanelWidth ?? GLOBAL_DATE_PICKER_CALENDAR_PANEL_WIDTH;

  const { style: portalStyle, placementOriginClass } = useGlobalDropdownPortal({
    open,
    anchorRef: wrapRef,
    contentRef: panelRef,
    matchAnchorWidth: false,
    panelWidth: resolvedCalendarPanelWidth,
    maxHeight: 420,
    repositionDeps: [viewYear, viewMonth, selectedYmd],
  });

  useDropdownOutsideDismiss(open, wrapRef, panelRef, closeCalendar);

  useEffect(() => {
    if (!open) return;
    const v = initialViewFromYmd(selectedYmd);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setViewYear(v.year);
    setViewMonth(v.month);
  }, [open, selectedYmd]);

  useLayoutEffect(() => {
    if (pendingCursor.current === null || !inputRef.current) return;
    const pos = pendingCursor.current;
    pendingCursor.current = null;
    inputRef.current.setSelectionRange(pos, pos);
  });

  const applyMaskedChange = useCallback(
    (nextRaw: string, selectionStart: number) => {
      const { display, cursor } = applyItalianDateMaskChange(value, nextRaw, selectionStart);
      pendingCursor.current = cursor;
      onChange(display);
    },
    [onChange, value],
  );

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      applyMaskedChange(e.target.value, e.target.selectionStart ?? 0);
    },
    [applyMaskedChange],
  );

  const onPaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = normalizeItalianDatePaste(e.clipboardData.getData("text"));
      const el = e.currentTarget;
      const selStart = el.selectionStart ?? 0;
      const selEnd = el.selectionEnd ?? selStart;
      const newRaw = value.slice(0, selStart) + pasted + value.slice(selEnd);
      applyMaskedChange(newRaw, selStart + pasted.length);
    },
    [applyMaskedChange, value],
  );

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

  const onTextBlur = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      onChange("");
      return;
    }
    const r = parseItalianDayDisplayToIso(trimmed);
    if (r.ok) onChange(isoToItDisplay(r.iso));
  }, [onChange, value]);

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
    <div className="w-full">
      <div ref={wrapRef} className={shellCombined}>
        <input
  // eslint-disable-next-line react-hooks/immutability -- lint phase2: preserve existing hook contract
          ref={(el) => {
            inputRef.current = el;
            if (typeof inputRefProp === "function") inputRefProp(el);
  // eslint-disable-next-line react-hooks/immutability -- lint phase2: preserve existing hook contract
            else if (inputRefProp) inputRefProp.current = el;
          }}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={showInvalid || undefined}
          aria-describedby={showInvalid ? errorId : undefined}
          className={inputClass}
          value={value}
          onChange={onInputChange}
          onPaste={onPaste}
          onBlur={onBlurProp ?? onTextBlur}
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
                (onBlurProp ?? onTextBlur)();
              }
              scheduleFocusNextGestionaleField(e.currentTarget);
              return;
            }
            if (disabled) return;
            const el = e.currentTarget;
            const selStart = el.selectionStart ?? 0;
            const selEnd = el.selectionEnd ?? selStart;
            if (e.key === "Backspace" && !e.ctrlKey && !e.metaKey && !e.altKey) {
              const r = applyItalianDateBackspace(value, selStart, selEnd);
              if (r) {
                e.preventDefault();
                pendingCursor.current = r.cursor;
                onChange(r.display);
              }
              return;
            }
            if (e.key === "Delete" && !e.ctrlKey && !e.metaKey && !e.altKey) {
              const r = applyItalianDateForwardDelete(value, selStart, selEnd);
              if (r) {
                e.preventDefault();
                pendingCursor.current = r.cursor;
                onChange(r.display);
              }
            }
          }}
        />
        <button
          type="button"
          className={globalInputDatePickerCalendarBtn}
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
      </div>
      {showInvalid && validation.message ? (
        <p id={errorId} className={globalInputInvalidMessage}>
          {validation.message}
        </p>
      ) : null}
      {typeof document !== "undefined" && calendarPortal ? createPortal(calendarPortal, document.body) : null}
    </div>
  );
}

function displayFromYmd(valueYmd: string): string {
  return valueYmd ? ymdToItDisplay(valueYmd) : "";
}

/** Filtri con valore interno `yyyy-mm-dd`. */
export function GlobalDatePickerYmd({
  valueYmd,
  onChangeYmd,
  id,
  placeholder = "gg/mm/aaaa",
  "aria-label": ariaLabel,
  variant = "filter",
  yearRange,
  disabled,
  inputClassName,
  calendarPanelWidth,
}: {
  valueYmd: string;
  onChangeYmd: (ymd: string) => void;
  id?: string;
  placeholder?: string;
  "aria-label"?: string;
  variant?: "default" | "filter";
  yearRange?: ItalianDateYearRange;
  disabled?: boolean;
  inputClassName?: string;
  calendarPanelWidth?: number;
}) {
  const [displayDraft, setDisplayDraft] = useState(() => displayFromYmd(valueYmd));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setDisplayDraft(displayFromYmd(valueYmd));
  }, [valueYmd]);

  const commitBlur = useCallback(() => {
    const trimmed = displayDraft.trim();
    if (!trimmed) {
      setDisplayDraft("");
      onChangeYmd("");
      return;
    }
    const r = parseItalianDayDisplayToIso(trimmed);
    if (r.ok) {
      const display = isoToItDisplay(r.iso);
      const ymd = isoToDateInputValue(r.iso);
      setDisplayDraft(display);
      onChangeYmd(ymd);
      return;
    }
    setDisplayDraft(trimmed);
  }, [displayDraft, onChangeYmd]);

  return (
    <GlobalDatePicker
      id={id}
      variant={variant}
      inputClassName={inputClassName}
      calendarPanelWidth={calendarPanelWidth}
      value={displayDraft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      yearRange={yearRange}
      disabled={disabled}
      onChange={(next) => {
        setDisplayDraft(next);
        if (!next.trim()) {
          onChangeYmd("");
          return;
        }
        const r = parseItalianDayDisplayToIso(next);
        if (r.ok) onChangeYmd(isoToDateInputValue(r.iso));
      }}
      onBlur={commitBlur}
    />
  );
}

/** Alias per filtri toolbar (compatibilità `LavorazioniFilterDateField`). */
export const GlobalFilterDateField = GlobalDatePickerYmd;
