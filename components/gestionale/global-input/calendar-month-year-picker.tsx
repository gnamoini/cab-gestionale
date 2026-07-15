"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatMonthTitle, MONTHS_IT } from "@/components/gestionale/global-input/calendar-utils";
import {
  CalendarNavChevronDown,
  CalendarNavChevronLeft,
  CalendarNavChevronRight,
} from "@/components/gestionale/global-input/calendar-nav-icons";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import { dsFocus } from "@/lib/ui/design-system";
import {
  globalInputCalendarDaySelected,
  globalInputCalendarDayToday,
  globalInputCalendarNavBtn,
  promemoriaPickerMenuPanel,
} from "@/lib/ui/global-input";

const MONTH_CELL_CLASS =
  "min-h-9 rounded-md px-1 py-2 text-xs font-semibold text-[color:var(--cab-text)] transition-colors hover:bg-[var(--cab-hover)]";

const TRIGGER_CLASS = {
  popup:
    "inline-flex min-w-0 flex-1 items-center justify-center gap-0.5 truncate rounded-md px-1 py-1 text-xs font-bold uppercase tracking-wide text-[color:var(--cab-text)] transition hover:bg-[var(--cab-hover)]",
  grid: "inline-flex min-w-0 items-center justify-center gap-0.5 truncate rounded-md px-1 py-1 text-sm font-semibold capitalize text-[color:var(--cab-text)] transition hover:bg-[var(--cab-hover)]",
  embedded:
    "inline-flex min-w-0 flex-1 items-center justify-center gap-1 truncate rounded-[var(--ds-radius-lg)] px-2 py-1.5 text-sm font-bold uppercase tracking-wide text-[color:var(--cab-text)] transition hover:bg-[var(--cab-hover)] active:scale-[0.98] motion-reduce:active:scale-100",
} as const;

export type CalendarMonthYearPickerVariant = keyof typeof TRIGGER_CLASS;

export function CalendarMonthYearPicker({
  viewYear,
  viewMonth,
  onApply,
  variant = "grid",
  disabled = false,
  showGoToday = true,
  className = "",
}: {
  viewYear: number;
  viewMonth: number;
  onApply: (year: number, month: number) => void;
  variant?: CalendarMonthYearPickerVariant;
  disabled?: boolean;
  showGoToday?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(viewYear);
  const [draftMonth, setDraftMonth] = useState(viewMonth);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const { todayYear, todayMonth } = useMemo(() => {
    const now = new Date();
    return { todayYear: now.getFullYear(), todayMonth: now.getMonth() };
  }, []);

  useEffect(() => {
    if (!open) return;
    setDraftYear(viewYear);
    setDraftMonth(viewMonth);
  }, [open, viewYear, viewMonth]);

  const close = useCallback(() => setOpen(false), []);

  const { style: portalStyle, placementOriginClass } = useGlobalDropdownPortal({
    open,
    anchorRef: triggerRef,
    contentRef: menuRef,
    repositionDeps: [draftYear, draftMonth],
    panelWidth: 272,
    matchAnchorWidth: false,
    maxHeight: 360,
  });

  useDropdownOutsideDismiss(open, triggerRef, menuRef, close);

  const applySelection = useCallback(
    (year: number, month: number) => {
      onApply(year, month);
      close();
    },
    [close, onApply],
  );

  const title = formatMonthTitle(viewYear, viewMonth);

  const menu =
    open && portalStyle ? (
      <div
        ref={menuRef}
        id={menuId}
        role="dialog"
        aria-label="Seleziona mese e anno"
        style={portalStyle}
        className={`${promemoriaPickerMenuPanel} ${placementOriginClass} overflow-hidden p-2.5`}
        onMouseDown={(event) => event.preventDefault()}
      >
        <div className="mb-2.5 flex items-center justify-between gap-1">
          <button
            type="button"
            className={`${globalInputCalendarNavBtn} !h-8 !w-8 ${dsFocus}`}
            aria-label="Anno precedente"
            onClick={() => setDraftYear((year) => year - 1)}
          >
            <CalendarNavChevronLeft />
          </button>
          <span className="min-w-0 flex-1 text-center text-sm font-bold tabular-nums text-[color:var(--cab-text)]">
            {draftYear}
          </span>
          <button
            type="button"
            className={`${globalInputCalendarNavBtn} !h-8 !w-8 ${dsFocus}`}
            aria-label="Anno successivo"
            onClick={() => setDraftYear((year) => year + 1)}
          >
            <CalendarNavChevronRight />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1" role="group" aria-label="Mesi">
          {MONTHS_IT.map((label, index) => {
            const selected = index === draftMonth;
            const isToday = draftYear === todayYear && index === todayMonth;
            return (
              <button
                key={label}
                type="button"
                className={`${MONTH_CELL_CLASS} ${dsFocus} ${
                  selected ? globalInputCalendarDaySelected : ""
                } ${isToday && !selected ? globalInputCalendarDayToday : ""}`}
                aria-pressed={selected}
                aria-label={label}
                onClick={() => applySelection(draftYear, index)}
              >
                {label.slice(0, 3)}
              </button>
            );
          })}
        </div>
        {showGoToday ? (
          <button
            type="button"
            className={`${dsFocus} mt-2.5 w-full rounded-md py-1.5 text-[11px] font-semibold text-[color:var(--cab-text-muted)] transition hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)]`}
            onClick={() => applySelection(todayYear, todayMonth)}
          >
            Vai a oggi
          </button>
        ) : null}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={`${TRIGGER_CLASS[variant]} ${dsFocus} ${className} ${disabled ? "pointer-events-none opacity-60" : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? menuId : undefined}
        aria-label={`Mese e anno, attuale ${title}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0 truncate">{title}</span>
        <CalendarNavChevronDown
          className={`shrink-0 text-[color:var(--cab-text-muted)] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </>
  );
}
