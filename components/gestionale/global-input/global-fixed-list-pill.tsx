"use client";

/**
 * Select a elenco fisso (senza ricerca): pill colorata + menu a tendina.
 * Standard globale per stato, priorità, addetto in tabella/card Lavorazioni e casi analoghi.
 * Per elenchi con ricerca/fuzzy/aggiunta valori usare `GlobalSelect`.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { dsFocus } from "@/lib/ui/design-system";
import { globalFixedListPillMenuPanel } from "@/lib/ui/global-input";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import { GestionaleSearchableSheetSelect } from "@/components/gestionale/global-input/gestionale-searchable-sheet-select";
import { useDropdownFocusRestore } from "@/lib/ui/use-dropdown-focus-restore";
import { useClientHydrated } from "@/lib/ui/use-client-hydrated";
import { useMaxMdDown } from "@/lib/ui/use-max-md-down";

export type FixedListPillOption = {
  value: string;
  label: string;
  /** Colori pill per voce (es. stato/priorità/addetto da impostazioni). */
  pillStyle?: CSSProperties;
};

const pillChevron = (
  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

export const fixedListPillTextClass = "text-[13px] font-medium leading-tight tracking-wide";

export const fixedListPillMinH = "min-h-8";

export function GlobalFixedListPillSelect({
  value,
  onChange,
  options,
  ariaLabel,
  disabled,
  title,
  /** Classi layout pill (bordo, ombra, focus ring) — un solo contenitore visivo. */
  shellClass,
  /** Stile pill selezionata se le opzioni non definiscono `pillStyle`. */
  fallbackPillStyle,
  mobileSheet = true,
  sheetTitle,
}: {
  value: string;
  onChange: (next: string) => void;
  options: readonly FixedListPillOption[];
  ariaLabel: string;
  disabled?: boolean;
  title?: string;
  shellClass?: string;
  fallbackPillStyle?: CSSProperties;
  /** Bottom sheet mobile senza ricerca (default: true). */
  mobileSheet?: boolean;
  /** Titolo sheet mobile (default: ariaLabel). */
  sheetTitle?: string;
}) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const sheetListScrollRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const hydrated = useClientHydrated();
  const isMobile = useMaxMdDown();
  const useMobileSheet = hydrated && isMobile && mobileSheet;
  const { restoreFocus, captureFocus } = useDropdownFocusRestore(open);
  const selected = options.find((o) => o.value === value);
  const triggerStyle = selected?.pillStyle ?? fallbackPillStyle;
  const resolvedSheetTitle = sheetTitle ?? ariaLabel;

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    restoreFocus();
  }, [restoreFocus]);

  const anchorRef = shellRef;

  const { style: portalStyle, scrollInside, placementOriginClass } = useGlobalDropdownPortal({
    open: open && !useMobileSheet,
    anchorRef,
    contentRef: menuRef,
    repositionDeps: [options.length],
  });

  useDropdownOutsideDismiss(open && !useMobileSheet, shellRef, menuRef, close);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (options.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
        return;
      }
      if (e.key === "Enter" && activeIndex >= 0 && activeIndex < options.length) {
        e.preventDefault();
        onChange(options[activeIndex]!.value);
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close, options, activeIndex, onChange]);

  const renderOption = (opt: FixedListPillOption, idx: number, variant: "dropdown" | "sheet") => {
    const active = opt.value === value;
    const highlighted = idx === activeIndex;
    const optStyle = opt.pillStyle ?? fallbackPillStyle;
    const touchMinH = variant === "sheet" ? "min-h-11" : "min-h-11 sm:min-h-0";
    const touchPy = variant === "sheet" ? "py-2.5" : "py-2.5 sm:py-1.5";
    return (
      <li key={opt.value} role="presentation" className={variant === "sheet" ? "px-2 py-1" : "py-0.5"}>
        <button
          type="button"
          role="option"
          aria-selected={active}
          style={optStyle}
          className={`w-full ${touchMinH} cursor-pointer rounded-md border px-2 ${touchPy} text-center ${fixedListPillTextClass} transition-[filter,box-shadow] duration-150 hover:brightness-[1.06] ${dsFocus} ${
            active ? "ring-2 ring-inset ring-white/35 shadow-sm" : ""
          }${highlighted && !active ? " ring-2 ring-inset ring-white/20" : ""}`}
          onMouseEnter={() => setActiveIndex(idx)}
          onClick={() => {
            onChange(opt.value);
            close();
          }}
        >
          {opt.label}
        </button>
      </li>
    );
  };

  const menu =
    open && portalStyle && !useMobileSheet ? (
      <ul
        ref={menuRef}
        id={listId}
        role="listbox"
        aria-label={ariaLabel}
        style={portalStyle}
        className={`${globalFixedListPillMenuPanel} ${placementOriginClass} ${
          scrollInside ? "overflow-y-auto" : "overflow-hidden"
        }`}
      >
        {options.map((opt, idx) => renderOption(opt, idx, "dropdown"))}
      </ul>
    ) : null;

  return (
    <div ref={shellRef} className={`relative flex w-full ${fixedListPillMinH} items-stretch`}>
      <button
        ref={triggerRef}
        type="button"
        style={triggerStyle}
        className={`flex min-h-8 w-full min-w-0 cursor-pointer items-center justify-center gap-1 px-2 py-1 text-center ${fixedListPillTextClass} outline-none transition-[filter,box-shadow,background-color,border-color,color] duration-150 hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-60 ${dsFocus} ${shellClass ?? "rounded-lg border border-black/10 shadow-sm dark:border-white/10"}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        title={title}
        onClick={() => {
          if (disabled) return;
          if (useMobileSheet) {
            captureFocus();
            setOpen(true);
            setActiveIndex(-1);
            return;
          }
          setOpen((o) => !o);
          setActiveIndex(-1);
        }}
      >
        <span className="min-w-0 truncate">{selected?.label ?? value}</span>
        {pillChevron}
      </button>
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
      <GestionaleSearchableSheetSelect
        open={open && useMobileSheet}
        onOpenChange={(next) => {
          if (!next) close();
          else setOpen(true);
        }}
        title={resolvedSheetTitle}
        showSearch={false}
        searchValue=""
        onSearchChange={() => {}}
        listScrollRef={sheetListScrollRef}
      >
        <ul id={listId} role="listbox" aria-label={ariaLabel}>
          {options.map((opt, idx) => renderOption(opt, idx, "sheet"))}
        </ul>
      </GestionaleSearchableSheetSelect>
    </div>
  );
}
