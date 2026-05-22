"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  autocompleteCommitFromSearchText,
  autocompleteCommittedDisplayValue,
  autocompleteDisplayValue,
  autocompleteFuzzySuggestion,
  autocompleteIsValid,
  autocompleteItemSuggestions,
  autocompleteShowAddPanel,
  autocompleteStringSuggestions,
  type AutocompleteDataMode,
} from "@/lib/global-autocomplete/engine";
import {
  globalAutocompleteAddBtnClass,
  globalAutocompleteDropdownPortalPanel,
  globalAutocompleteOptionClass,
  globalAutocompleteOptionPillClass,
  globalInputEmptyMessage,
  globalInputFieldDefault,
  globalInputFieldFilter,
  globalInputInvalidRing,
} from "@/lib/ui/global-input";
import { scheduleFocusNextGestionaleField } from "@/lib/ui/gestionale-focus-navigation";
import type { ListSelectItem } from "@/lib/ui/list-select-items";
import { normListSelectValue } from "@/lib/ui/list-select-utils";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import type { CSSProperties } from "react";

export type GlobalSelectOption = ListSelectItem & { pillStyle?: CSSProperties };

type GlobalSelectBaseProps = {
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  variant?: "default" | "filter";
  inputClassName?: string;
  id?: string;
  strictFromList?: boolean;
  invalidMessage?: string;
  forceInvalid?: boolean;
  onValidityChange?: (valid: boolean) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  allowAdd?: boolean;
  canAdd?: boolean;
  addPending?: boolean;
  onAddToList?: (value: string) => void | Promise<void>;
  /** Opzioni con pill colorate (stile stato lavorazione). */
  coloredOptions?: boolean;
  "aria-label"?: string;
};

export type GlobalSelectStringProps = GlobalSelectBaseProps & {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  items?: never;
};

export type GlobalSelectItemsProps = GlobalSelectBaseProps & {
  value: string;
  onChange: (value: string) => void;
  items: readonly GlobalSelectOption[];
  options?: never;
};

export type GlobalSelectProps = GlobalSelectStringProps | GlobalSelectItemsProps;

function fieldClassForVariant(
  variant: "default" | "filter",
  inputClassName?: string,
): string {
  if (inputClassName) return inputClassName;
  return variant === "filter" ? globalInputFieldFilter : globalInputFieldDefault;
}

/** @deprecated Usare `GlobalAutocompleteCombobox` — alias di `GlobalSelect`. */
export const GlobalAutocompleteCombobox = GlobalSelect;

export function GlobalSelect(props: GlobalSelectProps) {
  const {
    value,
    onChange,
    disabled,
    required,
    placeholder,
    className = "",
    variant = "default",
    inputClassName,
    id: idProp,
    strictFromList = true,
    invalidMessage = "Seleziona un valore esistente",
    forceInvalid = false,
    onValidityChange,
    isLoading = false,
    emptyMessage = globalInputEmptyMessage,
    allowAdd = false,
    canAdd = true,
    addPending = false,
    onAddToList,
    coloredOptions = false,
    "aria-label": ariaLabel,
  } = props;

  const itemsMode = "items" in props && props.items != null;
  const mode: AutocompleteDataMode = itemsMode ? "items" : "strings";
  const items = itemsMode ? props.items : [];
  const options = !itemsMode ? props.options : [];

  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listboxId = `${inputId}-listbox`;
  const fieldClass = fieldClassForVariant(variant, inputClassName);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [touched, setTouched] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [focused, setFocused] = useState(false);

  const engineInput = useMemo(
    () => ({
      mode,
      value,
      searchText,
      focused,
      open,
      options,
      items,
    }),
    [mode, value, searchText, focused, open, options, items],
  );

  const displayValue = useMemo(() => autocompleteDisplayValue(engineInput), [engineInput]);

  const suggestions = useMemo(() => {
    if (itemsMode) return autocompleteItemSuggestions(engineInput);
    return autocompleteStringSuggestions(engineInput);
  }, [engineInput, itemsMode]);

  const addCandidate = focused ? searchText.trim() : "";

  const fuzzySuggestion = useMemo(
    () => autocompleteFuzzySuggestion(addCandidate, mode, options, items),
    [addCandidate, mode, options, items],
  );

  const showAddPanel = autocompleteShowAddPanel({
    allowAdd,
    canAdd,
    hasOnAdd: Boolean(onAddToList),
    open,
    disabled: Boolean(disabled),
    isLoading,
    searchText,
    suggestionCount: suggestions.length,
  });

  const isValid = useMemo(
    () => autocompleteIsValid(value, Boolean(required), strictFromList, mode, options, items),
    [value, required, strictFromList, mode, options, items],
  );

  const showInvalid = (touched || forceInvalid) && !isValid;
  const showDropdown = open && !disabled && !isLoading;
  const listEmpty = !isLoading && suggestions.length === 0 && !showAddPanel && addCandidate.length > 0;
  const portalOpen = showDropdown && (suggestions.length > 0 || listEmpty || showAddPanel);

  const { coords, style: portalStyle } = useGlobalDropdownPortal({
    open: portalOpen,
    anchorRef: wrapRef,
    contentRef: dropdownRef,
    repositionDeps: [suggestions.length, showAddPanel, listEmpty],
  });

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const dismissDropdown = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    setFocused(false);
    setSearchText("");
  }, []);

  useDropdownOutsideDismiss(portalOpen, wrapRef, dropdownRef, dismissDropdown);

  const closeAndReset = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    setFocused(false);
    setSearchText("");
  }, []);

  const selectString = useCallback(
    (option: string, advanceFocus = true) => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      onChange(option);
      closeAndReset();
      setTouched(true);
      if (advanceFocus) scheduleFocusNextGestionaleField(inputRef.current);
    },
    [onChange, closeAndReset],
  );

  const selectItem = useCallback(
    (item: ListSelectItem, advanceFocus = true) => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      onChange(item.value);
      closeAndReset();
      setTouched(true);
      if (advanceFocus) scheduleFocusNextGestionaleField(inputRef.current);
    },
    [onChange, closeAndReset],
  );

  const runAdd = useCallback(async () => {
    if (!onAddToList || !addCandidate || addPending) return;
    await onAddToList(addCandidate);
    closeAndReset();
  }, [addCandidate, addPending, onAddToList, closeAndReset]);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      closeAndReset();
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
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
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (suggestions.length > 0) {
      const idx = activeIndex >= 0 ? activeIndex : 0;
      if (itemsMode) selectItem(suggestions[idx] as ListSelectItem);
      else selectString(suggestions[idx] as string);
      return;
    }
    if (showAddPanel && onAddToList) {
      void runAdd();
      return;
    }
    const committed = autocompleteCommitFromSearchText(searchText, mode, options, items, strictFromList);
    if (committed) {
      onChange(committed);
      closeAndReset();
      setTouched(true);
      scheduleFocusNextGestionaleField(inputRef.current);
    }
  };

  const seedSearchFromCommitted = useCallback(() => {
    setSearchText(autocompleteCommittedDisplayValue(engineInput));
  }, [engineInput]);

  const isFilterVariant = variant === "filter";

  const beginEditing = useCallback(() => {
    setFocused(true);
    setOpen(true);
    if (isFilterVariant) {
      setSearchText("");
    } else {
      seedSearchFromCommitted();
    }
  }, [isFilterVariant, seedSearchFromCommitted]);

  const commitBlur = () => {
    setOpen(false);
    setActiveIndex(-1);
    setTouched(true);
    setFocused(false);
    const trimmed = searchText.trim();
    if (!trimmed) {
      if (value && !isFilterVariant) onChange("");
      setSearchText("");
      return;
    }
    const committed = autocompleteCommitFromSearchText(searchText, mode, options, items, strictFromList);
    if (committed && committed !== value) onChange(committed);
    setSearchText("");
  };

  const fuzzyLabel =
    itemsMode && fuzzySuggestion && typeof fuzzySuggestion === "object"
      ? (fuzzySuggestion as ListSelectItem).label
      : typeof fuzzySuggestion === "string"
        ? fuzzySuggestion
        : null;

  const optionBtnClass = (active: boolean, selected: boolean, pillStyle?: CSSProperties) => {
    if (coloredOptions && pillStyle) {
      return globalAutocompleteOptionPillClass(active, selected, pillStyle);
    }
    return globalAutocompleteOptionClass(active, selected);
  };

  const dropdownPanelClass = `${globalAutocompleteDropdownPortalPanel} p-1 ${
    coords?.scrollInside ? "overflow-y-auto" : "overflow-hidden"
  }`;

  const dropdownPortal =
    portalOpen && coords && portalStyle ? (
      <div ref={dropdownRef} style={portalStyle}>
        {showDropdown && suggestions.length > 0 ? (
          <ul id={listboxId} role="listbox" className={dropdownPanelClass}>
            {suggestions.map((entry, idx) => {
              const active = idx === activeIndex;
              if (itemsMode) {
                const item = entry as GlobalSelectOption;
                const selected = item.value === value;
                return (
                  <li key={item.value} role="presentation" className="py-0.5">
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      style={coloredOptions ? item.pillStyle : undefined}
                      className={optionBtnClass(active, selected, item.pillStyle)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (blurTimer.current) clearTimeout(blurTimer.current);
                        selectItem(item, false);
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      {item.label}
                    </button>
                  </li>
                );
              }
              const option = entry as string;
              const selected = normListSelectValue(option) === normListSelectValue(value);
              return (
                <li key={option} role="presentation" className="py-0.5">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={optionBtnClass(active, selected)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (blurTimer.current) clearTimeout(blurTimer.current);
                      selectString(option, false);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    {option}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        {showDropdown && showAddPanel ? (
          <div
            id={listboxId}
            role="listbox"
            className={`${globalAutocompleteDropdownPortalPanel} px-3 py-2.5`}
          >
            <p className="text-xs text-[color:var(--cab-text-muted)]">
              {fuzzyLabel ? (
                <>
                  Forse cercavi:{" "}
                  <button
                    type="button"
                    className="font-semibold text-[color:var(--cab-primary)] underline-offset-2 hover:underline"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (blurTimer.current) clearTimeout(blurTimer.current);
                      if (itemsMode && fuzzySuggestion && typeof fuzzySuggestion === "object") {
                        selectItem(fuzzySuggestion as ListSelectItem, false);
                      } else if (typeof fuzzySuggestion === "string") {
                        selectString(fuzzySuggestion, false);
                      }
                    }}
                  >
                    {fuzzyLabel}
                  </button>
                </>
              ) : (
                <span className="font-medium">{emptyMessage}</span>
              )}
            </p>
            <button
              type="button"
              className={globalAutocompleteAddBtnClass}
              disabled={addPending}
              onMouseDown={(e) => {
                e.preventDefault();
                if (blurTimer.current) clearTimeout(blurTimer.current);
                void runAdd();
              }}
            >
              <span aria-hidden>+</span>
              {addPending ? "Aggiunta in corso…" : "Aggiungi all'elenco"}
            </button>
          </div>
        ) : null}
        {showDropdown && listEmpty && !showAddPanel ? (
          <div
            id={listboxId}
            role="status"
            className={`${globalAutocompleteDropdownPortalPanel} px-3 py-2.5 text-xs font-medium text-[color:var(--cab-text-muted)]`}
          >
            {emptyMessage}
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`.trim()}>
      {isLoading ? (
        <p className="mb-1 text-xs text-[color:var(--cab-text-muted)]" role="status">
          Caricamento elenco…
        </p>
      ) : null}
      <input
        ref={inputRef}
        id={inputId}
        aria-label={ariaLabel}
        className={`${fieldClass}${showInvalid ? globalInputInvalidRing : ""}`}
        value={displayValue}
        onChange={(e) => {
          const next = e.target.value;
          setFocused(true);
          setSearchText(next);
          setOpen(true);
          setActiveIndex(-1);
          if (next === "" && !isFilterVariant) onChange("");
        }}
        onFocus={beginEditing}
        onClick={() => {
          if (!open) beginEditing();
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(commitBlur, 120);
        }}
        onKeyDown={onInputKeyDown}
        disabled={disabled || isLoading}
        required={required && !strictFromList}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown && (suggestions.length > 0 || listEmpty || showAddPanel)}
        aria-controls={listboxId}
        aria-invalid={showInvalid || undefined}
        aria-autocomplete="list"
        aria-busy={isLoading || addPending || undefined}
      />
      {typeof document !== "undefined" && dropdownPortal ? createPortal(dropdownPortal, document.body) : null}
      {showInvalid ? (
        <p className="mt-1 text-[11px] font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]">
          {invalidMessage}
        </p>
      ) : null}
    </div>
  );
}
