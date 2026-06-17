"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import { GestionaleSearchableSheetSelect } from "@/components/gestionale/global-input/gestionale-searchable-sheet-select";
import { HighlightSearchMatch } from "@/components/gestionale/global-input/highlight-search-match";
import {
  findExactMezzoForIngressoIdent,
  mezzoIngressoSuggestSecondaryLabel,
  suggestMezziForIngressoIdent,
  type SchedaIngressoIdentField,
} from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  globalAutocompleteAddBtnClass,
  globalAutocompleteDropdownPortalPanel,
  globalAutocompleteOptionClass,
  globalInputFieldDefault,
} from "@/lib/ui/global-input";
import { useClientHydrated } from "@/lib/ui/use-client-hydrated";
import { useDropdownFocusRestore } from "@/lib/ui/use-dropdown-focus-restore";
import { armSelectorGhostClickGuard } from "@/lib/selector-interaction/suppress-selector-ghost-click";
import { useSelectorExclusiveGroup } from "@/lib/selector-interaction/use-selector-exclusive-group";
import { useSelectorFocusChain } from "@/lib/selector-interaction/use-selector-focus-chain";
import { useMaxMdDown } from "@/lib/ui/use-max-md-down";

function identPlaceholder(field: SchedaIngressoIdentField): string {
  if (field === "targa") return "Cerca targa…";
  if (field === "matricola") return "Cerca matricola…";
  return "Cerca scuderia…";
}

export function SchedaIngressoIdentAutocompleteField({
  field,
  label,
  value,
  siblingIdent = {},
  mezzi,
  readOnly,
  disabled,
  className = "",
  id: idProp,
  exclusiveGroup,
  onChange,
  onExactMezzoMatch,
}: {
  field: SchedaIngressoIdentField;
  label: string;
  value: string;
  siblingIdent?: { targa?: string; matricola?: string; nScuderia?: string };
  mezzi: readonly MezzoGestito[];
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  exclusiveGroup?: string;
  onChange: (value: string) => void;
  /** Chiamato quando targa/matricola/scuderia corrisponde a un mezzo registrato. */
  onExactMezzoMatch: (mezzo: MezzoGestito) => void;
}) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listboxId = `${inputId}-listbox`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetListScrollRef = useRef<HTMLDivElement>(null);
  const sheetSearchRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipBlurMatch = useRef(false);
  const skipSheetOpenOnFocusRef = useRef(false);
  const sheetQueryRef = useRef("");

  const hydrated = useClientHydrated();
  const isMobile = useMaxMdDown();
  const useMobileSheet = hydrated && isMobile && !readOnly;
  const placeholder = identPlaceholder(field);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const [sheetQuery, setSheetQuery] = useState("");
  sheetQueryRef.current = sheetQuery;

  const { restoreFocus, captureFocus } = useDropdownFocusRestore(open);

  const desktopQuery = focused ? value : value;
  const suggestions = useMemo(
    () => suggestMezziForIngressoIdent(mezzi, field, useMobileSheet && open ? sheetQuery : desktopQuery),
    [mezzi, field, useMobileSheet, open, sheetQuery, desktopQuery],
  );

  const showDesktopDropdown = open && !readOnly && !disabled && !useMobileSheet && suggestions.length > 0;
  const sheetOpen = open && useMobileSheet;

  const { style: portalStyle, scrollInside, placementOriginClass } = useGlobalDropdownPortal({
    open: showDesktopDropdown,
    anchorRef: wrapRef,
    contentRef: dropdownRef,
    repositionDeps: [suggestions.length, value],
  });

  const resetUi = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    setFocused(false);
    setSheetQuery("");
    skipSheetOpenOnFocusRef.current = true;
    restoreFocus();
    requestAnimationFrame(() => {
      skipSheetOpenOnFocusRef.current = false;
    });
  }, [restoreFocus]);

  const { notifyOpening } = useSelectorExclusiveGroup(exclusiveGroup, resetUi);

  const onFocusIn = useCallback((el: HTMLElement) => {
    void el;
  }, []);

  const captureTriggerFocus = useSelectorFocusChain({
    sheetOpen,
    sheetSearchRef,
    triggerRef: inputRef,
    onFocusIn,
  });

  useDropdownOutsideDismiss(showDesktopDropdown, wrapRef, dropdownRef, resetUi);

  const identPreview = useCallback(
    (mezzo: MezzoGestito) => {
      const ident =
        field === "targa"
          ? mezzo.targa?.trim() ?? ""
          : field === "matricola"
            ? mezzo.matricola?.trim() ?? ""
            : mezzo.numeroScuderia?.trim() ?? "";
      return ident || "—";
    },
    [field],
  );

  const tryExactMatch = useCallback(
    (nextValue: string) => {
      const hit = findExactMezzoForIngressoIdent(mezzi, field, nextValue, siblingIdent);
      if (hit) onExactMezzoMatch(hit);
    },
    [field, mezzi, onExactMezzoMatch, siblingIdent],
  );

  const commitFreeText = useCallback(
    (raw: string) => {
      const next = raw.trim();
      skipBlurMatch.current = true;
      onChange(next);
      resetUi();
      tryExactMatch(next);
    },
    [onChange, resetUi, tryExactMatch],
  );

  const closeSheetWithCommit = useCallback(() => {
    const pending = sheetQueryRef.current.trim();
    if (pending && pending !== value.trim()) {
      commitFreeText(pending);
      return;
    }
    resetUi();
  }, [commitFreeText, resetUi, value]);

  const pickMezzo = useCallback(
    (mezzo: MezzoGestito) => {
      skipBlurMatch.current = true;
      const ident = identPreview(mezzo);
      onChange(ident === "—" ? "" : ident);
      resetUi();
      onExactMezzoMatch(mezzo);
    },
    [identPreview, onChange, onExactMezzoMatch, resetUi],
  );

  const tryExactMatchOnBlur = useCallback(() => {
    if (skipBlurMatch.current) {
      skipBlurMatch.current = false;
      return;
    }
    tryExactMatch(value);
  }, [tryExactMatch, value]);

  const openSheet = useCallback(() => {
    if (disabled || readOnly) return;
    if (blurTimer.current) clearTimeout(blurTimer.current);
    if (open) return;
    notifyOpening();
    captureFocus();
    captureTriggerFocus();
    setSheetQuery("");
    setActiveIndex(-1);
    setOpen(true);
  }, [captureFocus, captureTriggerFocus, disabled, notifyOpening, open, readOnly]);

  const renderSuggestion = (mezzo: MezzoGestito, idx: number, variant: "dropdown" | "sheet") => {
    const active = idx === activeIndex;
    const ident = identPreview(mezzo);
    const query = variant === "sheet" ? sheetQuery : value;
    const touchClass = variant === "sheet" ? "min-h-11 py-2.5 sm:min-h-0 sm:py-1.5" : "";
    return (
      <li key={mezzo.id} role="presentation" className={variant === "sheet" ? "px-2 py-0.5" : "py-0.5"}>
        <button
          type="button"
          role="option"
          aria-selected={active}
          className={`${globalAutocompleteOptionClass(active)} ${touchClass}`.trim()}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (variant === "sheet") armSelectorGhostClickGuard();
            if (blurTimer.current) clearTimeout(blurTimer.current);
            pickMezzo(mezzo);
          }}
          onClick={(e) => {
            if (variant === "sheet") {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onMouseEnter={() => setActiveIndex(idx)}
        >
          <span className="block font-medium text-[color:var(--cab-text)]">
            <HighlightSearchMatch text={ident} query={query} />
          </span>
          <span className="mt-0.5 block text-[10px] font-normal text-[color:var(--cab-text-muted)]">
            {mezzoIngressoSuggestSecondaryLabel(mezzo, field)}
          </span>
        </button>
      </li>
    );
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (useMobileSheet) return;
    if (e.key === "Escape") {
      resetUi();
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      notifyOpening();
      setOpen(true);
      setActiveIndex(suggestions.length ? 0 : -1);
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % suggestions.length);
      return;
    }
    if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      return;
    }
    if (e.key === "Enter" && open && suggestions.length) {
      e.preventDefault();
      const idx = activeIndex >= 0 ? activeIndex : 0;
      pickMezzo(suggestions[idx]!);
    }
  };

  const onSheetSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      closeSheetWithCommit();
      return;
    }
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const q = sheetQuery.trim();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        pickMezzo(suggestions[activeIndex]!);
        return;
      }
      if (q) commitFreeText(q);
    }
  };

  const dropdownPortal =
    showDesktopDropdown && portalStyle ? (
      <ul
        ref={dropdownRef}
        id={listboxId}
        role="listbox"
        style={portalStyle}
        className={`${globalAutocompleteDropdownPortalPanel} p-1 ${placementOriginClass} ${
          scrollInside ? "overflow-y-auto" : "overflow-hidden"
        }`}
      >
        {suggestions.map((mezzo, idx) => renderSuggestion(mezzo, idx, "dropdown"))}
      </ul>
    ) : null;

  const sheetFreeText = sheetQuery.trim();
  const triggerClassName = useMobileSheet
    ? `${globalInputFieldDefault} gestionale-combobox-trigger font-mono cursor-pointer caret-transparent`
    : `${globalInputFieldDefault} font-mono`;

  return (
    <label htmlFor={inputId} className={`block text-xs ${className}`.trim()}>
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <div ref={wrapRef} className="relative mt-1">
        <input
          ref={inputRef}
          id={inputId}
          className={triggerClassName}
          readOnly={readOnly || useMobileSheet || undefined}
          disabled={disabled}
          value={value}
          onChange={(e) => {
            if (useMobileSheet) return;
            onChange(e.target.value);
            notifyOpening();
            setOpen(true);
            setActiveIndex(-1);
          }}
          onMouseDown={useMobileSheet ? (e) => e.preventDefault() : undefined}
          onFocus={() => {
            if (useMobileSheet) {
              if (!skipSheetOpenOnFocusRef.current) openSheet();
              return;
            }
            notifyOpening();
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => {
            if (useMobileSheet) return;
            if (blurTimer.current) clearTimeout(blurTimer.current);
            blurTimer.current = setTimeout(() => {
              resetUi();
              tryExactMatchOnBlur();
            }, 140);
          }}
          onClick={() => {
            if (useMobileSheet) openSheet();
          }}
          onKeyDown={onInputKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role={useMobileSheet ? "button" : "combobox"}
          aria-haspopup={useMobileSheet ? "listbox" : undefined}
          aria-expanded={useMobileSheet ? sheetOpen : showDesktopDropdown}
          aria-controls={listboxId}
          aria-autocomplete={useMobileSheet ? "none" : "list"}
          aria-readonly={useMobileSheet || undefined}
          enterKeyHint={useMobileSheet ? "search" : undefined}
        />
        {typeof document !== "undefined" && dropdownPortal ? createPortal(dropdownPortal, document.body) : null}
        <GestionaleSearchableSheetSelect
          open={sheetOpen}
          onOpenChange={(next) => {
            if (!next) closeSheetWithCommit();
            else {
              notifyOpening();
              setOpen(true);
            }
          }}
          title={label}
          showSearch
          searchValue={sheetQuery}
          onSearchChange={(v) => {
            setSheetQuery(v);
            setActiveIndex(-1);
          }}
          searchPlaceholder={placeholder}
          searchAriaLabel={`Cerca in ${label}`}
          listScrollRef={sheetListScrollRef}
          searchInputRef={sheetSearchRef}
          onSearchKeyDown={onSheetSearchKeyDown}
          footer={
            sheetFreeText ? (
              <button
                type="button"
                className={globalAutocompleteAddBtnClass}
                onClick={() => commitFreeText(sheetFreeText)}
              >
                Usa «{sheetFreeText}»
              </button>
            ) : (
              <p className="px-1 text-center text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
                Seleziona un mezzo dai suggerimenti o digita un valore nuovo
              </p>
            )
          }
        >
          <ul id={listboxId} role="listbox" aria-label={label}>
            {suggestions.length === 0 && sheetFreeText ? (
              <li className="px-3 py-2 text-xs text-[color:var(--cab-text-muted)]" role="presentation">
                Nessun mezzo corrispondente — puoi usare il valore digitato.
              </li>
            ) : null}
            {suggestions.map((mezzo, idx) => renderSuggestion(mezzo, idx, "sheet"))}
          </ul>
        </GestionaleSearchableSheetSelect>
      </div>
    </label>
  );
}
