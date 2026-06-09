"use client";

import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  autocompleteCommitFromSearchText,
  autocompleteCommittedDisplayValue,
  autocompleteDisplayValue,
  autocompleteFuzzySuggestion,
  autocompleteIsValid,
  autocompleteItemSuggestions,
  autocompleteShowAddOption,
  autocompleteAddOptionEnabled,
  autocompleteStringSuggestions,
  AUTOCOMPLETE_BROWSE_CAP,
  type AutocompleteDataMode,
} from "@/lib/global-autocomplete/engine";
import {
  globalAutocompleteAddBtnClass,
  globalAutocompleteDropdownPortalPanel,
  globalAutocompleteOptionClass,
  globalAutocompleteOptionPillClass,
  globalInputEmptyMessage,
  globalInputFieldDefault,
  globalInputFieldFilterSearch,
  globalInputFieldFilterSelect,
  globalInputInvalidRing,
} from "@/lib/ui/global-input";
import { scheduleFocusNextGestionaleField } from "@/lib/ui/gestionale-focus-navigation";
import {
  registerGestionaleComboboxFlush,
  unregisterGestionaleComboboxFlush,
} from "@/lib/ui/gestionale-form-submit-flush";
import { scheduleGestionaleFieldScroll } from "@/lib/ui/mobile-modal-behavior";
import { useClientHydrated } from "@/lib/ui/use-client-hydrated";
import type { ListSelectItem } from "@/lib/ui/list-select-items";
import { normListSelectValue } from "@/lib/ui/list-select-utils";
import { findSimilarEntityInPool } from "@/lib/validation/global-entity-validation";
import { EntitySimilarWarning } from "@/components/design-system/entity-similar-warning";
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
  onAddToList?: (value: string) => void | Promise<string | null | void> | string | null;
  /** Opzioni con pill colorate (stile stato lavorazione). */
  coloredOptions?: boolean;
  /** Valori filtro "neutrali" (es. FILTER_ALL): al focus svuotano il campo per cercare. */
  filterNeutralValues?: readonly string[];
  "aria-label"?: string;
  /** Mostra warning non bloccante se il testo digitato è simile a un'opzione esistente. */
  showSimilarWarning?: boolean;
  /** Standardizza sigle societarie (SRL/SPA) nel confronto similarità. */
  similarStandardizeLegalSuffix?: boolean;
  /** Solo scelta da elenco: niente digitazione né filtro testuale. */
  selectOnly?: boolean;
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
  selectOnly?: boolean,
): string {
  if (inputClassName) return inputClassName;
  if (variant === "filter") {
    return selectOnly ? globalInputFieldFilterSelect : globalInputFieldFilterSearch;
  }
  return globalInputFieldDefault;
}

function isFilterNeutralValue(value: string, neutralValues?: readonly string[]): boolean {
  if (!value.trim()) return true;
  if (!neutralValues?.length) return false;
  return neutralValues.includes(value);
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
    filterNeutralValues,
    showSimilarWarning = true,
    similarStandardizeLegalSuffix = false,
    selectOnly = false,
    "aria-label": ariaLabel,
  } = props;

  const isFilterVariant = variant === "filter";

  const itemsMode = "items" in props && props.items != null;
  const mode: AutocompleteDataMode = itemsMode ? "items" : "strings";
  const items = itemsMode ? props.items : [];
  const options = !itemsMode ? props.options : [];

  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listboxId = `${inputId}-listbox`;
  const hydrated = useClientHydrated();
  const showLoadingUi = hydrated && isLoading;
  const fieldClass = useMemo(() => {
    const base = fieldClassForVariant(variant, inputClassName, selectOnly);
    if (!selectOnly) return base;
    const normalized = base
      .replace(/\bcursor-text\b/g, "")
      .replace(/\bappearance-auto\b/g, "appearance-none")
      .trim();
    return `${normalized} cursor-pointer caret-transparent`;
  }, [variant, inputClassName, selectOnly]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editSessionRef = useRef({ modified: false });
  const addInFlightRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [touched, setTouched] = useState(false);
  const [searchText, setSearchText] = useState("");
  const deferredSearchText = useDeferredValue(searchText);
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

  const isDeferPending = searchText !== deferredSearchText;
  const suggestionSearchText =
    isDeferPending && !editSessionRef.current.modified ? searchText : deferredSearchText;

  const suggestionEngineInput = useMemo(
    () => ({ ...engineInput, searchText: suggestionSearchText }),
    [engineInput, suggestionSearchText],
  );

  const suggestions = useMemo(() => {
    if (selectOnly) {
      if (itemsMode) return [...items].slice(0, AUTOCOMPLETE_BROWSE_CAP);
      const seen = new Set<string>();
      const ordered: string[] = [];
      for (const option of options) {
        const trimmed = option.trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        ordered.push(trimmed);
      }
      return ordered.slice(0, AUTOCOMPLETE_BROWSE_CAP);
    }
    if (itemsMode) return autocompleteItemSuggestions(suggestionEngineInput);
    return autocompleteStringSuggestions(suggestionEngineInput);
  }, [selectOnly, suggestionEngineInput, itemsMode, items, options]);

  const addCandidate = focused ? searchText.trim() : "";

  const fuzzySuggestion = useMemo(
    () => autocompleteFuzzySuggestion(addCandidate, mode, options, items),
    [addCandidate, mode, options, items],
  );

  const showAddOption = autocompleteShowAddOption({
    allowAdd,
    canAdd,
    hasOnAdd: Boolean(onAddToList),
    open,
    disabled: Boolean(disabled),
    isLoading,
  });
  const addOptionEnabled = autocompleteAddOptionEnabled(addCandidate, addPending);
  const addOptionIndex = showAddOption ? suggestions.length : -1;
  const totalNavigableOptions = suggestions.length + (showAddOption ? 1 : 0);

  const isValid = useMemo(() => {
    if (isFilterVariant && isFilterNeutralValue(value, filterNeutralValues)) return true;
    return autocompleteIsValid(value, Boolean(required), strictFromList, mode, options, items);
  }, [isFilterVariant, value, filterNeutralValues, required, strictFromList, mode, options, items]);

  const showInvalid = (touched || forceInvalid) && !isValid;
  const activeTextForSimilar = focused || searchText.length > 0 ? deferredSearchText : value;
  const similarPool = useMemo(() => {
    if (itemsMode) return items.map((item) => item.label);
    return [...options];
  }, [itemsMode, items, options]);
  const similarTo = useMemo(() => {
    if (isFilterVariant || !showSimilarWarning || similarPool.length === 0) return null;
    const text = activeTextForSimilar.trim();
    if (!text) return null;
    return findSimilarEntityInPool(text, similarPool, {
      exclude: value.trim() || undefined,
      standardizeLegalSuffix: similarStandardizeLegalSuffix,
    });
  }, [isFilterVariant, showSimilarWarning, similarPool, activeTextForSimilar, value, similarStandardizeLegalSuffix]);
  const showDropdown = open && !disabled && !showLoadingUi;
  const listEmpty = !showLoadingUi && suggestions.length === 0 && !showAddOption && addCandidate.length > 0;
  const portalOpen = showDropdown && (totalNavigableOptions > 0 || listEmpty);

  const { style: portalStyle, scrollInside, placementOriginClass } = useGlobalDropdownPortal({
    open: portalOpen,
    anchorRef: wrapRef,
    contentRef: dropdownRef,
    repositionDeps: [suggestions.length, showAddOption, listEmpty, addOptionEnabled],
  });

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const canClearCommittedFilter = useCallback(() => {
    if (!value.trim()) return false;
    return !isFilterNeutralValue(value, filterNeutralValues);
  }, [value, filterNeutralValues]);

  /** Submit flush: invariante visibile === committato, senza gate userModified. */
  const commitPendingForSubmit = useCallback(() => {
    if (selectOnly) return;
    if (blurTimer.current) clearTimeout(blurTimer.current);
    const rawSearch = inputRef.current?.value ?? searchText;
    const trimmed = rawSearch.trim();
    const committedValue = value.trim();
    if (trimmed === committedValue) {
      setOpen(false);
      setActiveIndex(-1);
      setSearchText("");
      setFocused(false);
      return;
    }
    editSessionRef.current.modified = false;
    setOpen(false);
    setActiveIndex(-1);
    setTouched(true);
    setFocused(false);
    if (!trimmed) {
      if (!isFilterVariant) {
        if (value) onChange("");
      } else if (canClearCommittedFilter()) {
        onChange("");
      }
      setSearchText("");
      return;
    }
    const committed = autocompleteCommitFromSearchText(rawSearch, mode, options, items, strictFromList);
    if (isFilterVariant) {
      if (committed && committed !== value) onChange(committed);
    } else if (committed && committed !== value) {
      onChange(committed);
    } else if (trimmed !== value) {
      onChange(trimmed);
    }
    setSearchText("");
  }, [
    selectOnly,
    searchText,
    value,
    isFilterVariant,
    canClearCommittedFilter,
    mode,
    options,
    items,
    strictFromList,
    onChange,
  ]);

  const commitBlur = useCallback(() => {
    if (selectOnly) {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    const rawSearch = inputRef.current?.value ?? searchText;
    const trimmed = rawSearch.trim();
    const typedPending = Boolean(trimmed && trimmed !== value.trim());
    const userModified = editSessionRef.current.modified || typedPending;
    editSessionRef.current.modified = false;
    setOpen(false);
    setActiveIndex(-1);
    setTouched(true);
    setFocused(false);
    if (!trimmed) {
      if (userModified) {
        if (!isFilterVariant) {
          if (value) onChange("");
        } else if (canClearCommittedFilter()) {
          onChange("");
        }
      }
      setSearchText("");
      return;
    }
    const committed = autocompleteCommitFromSearchText(rawSearch, mode, options, items, strictFromList);
    if (committed && committed !== value) {
      onChange(committed);
    } else if (trimmed !== value && !isFilterVariant) {
      // Submit/blur flush: committa testo digitato anche senza permesso append elenco.
      onChange(trimmed);
    }
    setSearchText("");
  }, [
    selectOnly,
    searchText,
    value,
    isFilterVariant,
    canClearCommittedFilter,
    mode,
    options,
    items,
    strictFromList,
    onChange,
  ]);

  /** Tap fuori (es. Salva) chiude il menu: committa testo pendente invece di scartarlo. */
  const dismissDropdown = useCallback(() => {
    if (selectOnly) {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    const domPending = inputRef.current?.value.trim() ?? "";
    const hasPending =
      editSessionRef.current.modified || Boolean(searchText.trim()) || Boolean(domPending);
    if (hasPending) {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      commitBlur();
      return;
    }
    setOpen(false);
    setActiveIndex(-1);
    setFocused(false);
    editSessionRef.current.modified = false;
    setSearchText("");
  }, [selectOnly, searchText, commitBlur]);

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
      editSessionRef.current.modified = false;
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
      editSessionRef.current.modified = false;
      onChange(item.value);
      closeAndReset();
      setTouched(true);
      if (advanceFocus) scheduleFocusNextGestionaleField(inputRef.current);
    },
    [onChange, closeAndReset],
  );

  const runAdd = useCallback(async () => {
    if (!onAddToList || !addCandidate || addPending || addInFlightRef.current) return;
    addInFlightRef.current = true;
    if (blurTimer.current) clearTimeout(blurTimer.current);
    try {
      const result = await onAddToList(addCandidate);
      const canonical =
        typeof result === "string" && result.trim()
          ? result.trim()
          : addCandidate.trim();
      editSessionRef.current.modified = false;
      if (canonical && normListSelectValue(canonical) !== normListSelectValue(value)) {
        onChange(canonical);
      }
      closeAndReset();
      setTouched(true);
    } catch {
      /* onAddToList gestisce toast/ritorno null */
    } finally {
      addInFlightRef.current = false;
    }
  }, [addCandidate, addPending, onAddToList, closeAndReset, onChange, value]);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (open) e.preventDefault();
      closeAndReset();
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      setActiveIndex(totalNavigableOptions > 0 ? 0 : -1);
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown" && totalNavigableOptions > 0) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % totalNavigableOptions);
      return;
    }
    if (e.key === "ArrowUp" && totalNavigableOptions > 0) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i <= 0 ? totalNavigableOptions - 1 : i - 1));
      return;
    }
    if (e.key === "Tab" && totalNavigableOptions > 0) {
      e.preventDefault();
      setOpen(true);
      if (e.shiftKey) {
        setActiveIndex((i) => (i <= 0 ? totalNavigableOptions - 1 : i - 1));
      } else {
        setActiveIndex((i) => (i < 0 ? 0 : (i + 1) % totalNavigableOptions));
      }
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (
      showAddOption &&
      addOptionEnabled &&
      (activeIndex === addOptionIndex || (suggestions.length === 0 && addCandidate))
    ) {
      void runAdd();
      return;
    }
    if (suggestions.length > 0) {
      const idx = activeIndex >= 0 && activeIndex < suggestions.length ? activeIndex : 0;
      if (itemsMode) selectItem(suggestions[idx] as ListSelectItem);
      else selectString(suggestions[idx] as string);
      return;
    }
    const committed = autocompleteCommitFromSearchText(searchText, mode, options, items, strictFromList);
    if (committed) {
      editSessionRef.current.modified = false;
      onChange(committed);
      closeAndReset();
      setTouched(true);
      scheduleFocusNextGestionaleField(inputRef.current);
    }
  };

  const seedSearchFromCommitted = useCallback(() => {
    setSearchText(autocompleteCommittedDisplayValue(engineInput));
  }, [engineInput]);

  const beginEditing = useCallback(() => {
    editSessionRef.current.modified = false;
    setFocused(true);
    setOpen(true);
    if (isFilterVariant && isFilterNeutralValue(value, filterNeutralValues)) {
      setSearchText("");
    } else {
      seedSearchFromCommitted();
    }
    scheduleGestionaleFieldScroll(inputRef.current, { extraBottom: 20 });
  }, [isFilterVariant, filterNeutralValues, seedSearchFromCommitted, value]);

  const handleSelectOnlyTriggerMouseDown = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []);

  const handleSelectOnlyTriggerClick = useCallback(() => {
    if (open) {
      dismissDropdown();
    } else {
      setOpen(true);
      setActiveIndex(-1);
      scheduleGestionaleFieldScroll(inputRef.current, { extraBottom: 20 });
    }
  }, [open, dismissDropdown]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const flush = () => {
      commitPendingForSubmit();
    };
    registerGestionaleComboboxFlush(input, flush);
    return () => unregisterGestionaleComboboxFlush(input);
  }, [commitPendingForSubmit]);

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

  const dropdownPanelClass = `${globalAutocompleteDropdownPortalPanel} p-1 ${placementOriginClass} ${
    scrollInside ? "overflow-y-auto" : "overflow-hidden"
  }`;

  const addOptionActive = activeIndex === addOptionIndex;
  const addOptionBtnClass = `${globalAutocompleteAddBtnClass}${
    addOptionActive ? " ring-2 ring-inset ring-white/25 shadow-sm" : ""
  }`;

  const dropdownPortal =
    portalOpen && portalStyle ? (
      <div ref={dropdownRef} style={portalStyle}>
        {showDropdown && totalNavigableOptions > 0 ? (
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
            {showAddOption ? (
              <li
                role="presentation"
                className={`py-0.5 ${suggestions.length > 0 ? "mt-0.5 border-t border-[color:var(--cab-border)] pt-1" : ""}`}
              >
                {suggestions.length === 0 && fuzzyLabel ? (
                  <p className="px-2 pb-1.5 text-xs text-[color:var(--cab-text-muted)]">
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
                  </p>
                ) : null}
                {suggestions.length === 0 && !fuzzyLabel && addCandidate ? (
                  <p className="px-2 pb-1.5 text-xs font-medium text-[color:var(--cab-text-muted)]">
                    {emptyMessage}
                  </p>
                ) : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={addOptionActive}
                  className={addOptionBtnClass}
                  disabled={!addOptionEnabled}
                  title={addOptionEnabled ? undefined : "Digita un valore da aggiungere"}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (blurTimer.current) clearTimeout(blurTimer.current);
                    if (addOptionEnabled) void runAdd();
                  }}
                  onMouseEnter={() => setActiveIndex(addOptionIndex)}
                >
                  <span aria-hidden>+</span>
                  {addPending ? "Aggiunta in corso…" : addCandidate ? `Aggiungi «${addCandidate}»` : "Aggiungi all'elenco"}
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
        {showDropdown && listEmpty ? (
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

  const loadingPlaceholder = "Caricamento elenco…";
  const resolvedPlaceholder = showLoadingUi ? loadingPlaceholder : placeholder;

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`.trim()}>
      <input
        ref={inputRef}
        id={inputId}
        aria-label={ariaLabel}
        className={`${fieldClass}${showInvalid ? globalInputInvalidRing : ""}`}
        value={displayValue}
        onChange={(e) => {
          if (selectOnly) return;
          const next = e.target.value;
          editSessionRef.current.modified = true;
          setFocused(true);
          setSearchText(next);
          setOpen(true);
          setActiveIndex(-1);
          if (next === "") {
            if (!isFilterVariant) onChange("");
            else if (canClearCommittedFilter()) onChange("");
          }
        }}
        onFocus={() => {
          if (selectOnly) {
            scheduleGestionaleFieldScroll(inputRef.current, { extraBottom: 20 });
            return;
          }
          beginEditing();
        }}
        onMouseDown={selectOnly ? handleSelectOnlyTriggerMouseDown : undefined}
        onClick={() => {
          if (selectOnly) {
            handleSelectOnlyTriggerClick();
            return;
          }
          if (!open) beginEditing();
        }}
        readOnly={selectOnly || undefined}
        onBlur={() => {
          blurTimer.current = setTimeout(commitBlur, 120);
        }}
        onKeyDown={onInputKeyDown}
        disabled={disabled || showLoadingUi}
        required={required && !strictFromList}
        placeholder={resolvedPlaceholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown && (totalNavigableOptions > 0 || listEmpty)}
        aria-controls={listboxId}
        aria-invalid={showInvalid || undefined}
        aria-autocomplete={selectOnly ? "none" : "list"}
        aria-readonly={selectOnly || undefined}
        aria-busy={showLoadingUi || addPending || undefined}
      />
      {typeof document !== "undefined" && dropdownPortal ? createPortal(dropdownPortal, document.body) : null}
      {showInvalid ? (
        <p className="mt-1 text-[11px] font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]">
          {invalidMessage}
        </p>
      ) : null}
      <EntitySimilarWarning similarTo={similarTo} />
    </div>
  );
}
