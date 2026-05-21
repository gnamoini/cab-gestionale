"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  globalInputDropdownOptionClass,
  globalInputDropdownPanel,
  globalInputEmptyMessage,
  globalInputFieldDefault,
  globalInputFieldFilter,
  globalInputInvalidRing,
} from "@/lib/ui/global-input";
import {
  filterItemSelectSuggestions,
  findItemByLabel,
  findItemByValue,
  isValueInItems,
  type ListSelectItem,
} from "@/lib/ui/list-select-items";
import { scheduleFocusNextGestionaleField } from "@/lib/ui/gestionale-focus-navigation";
import {
  filterListSelectSuggestions,
  findExactListOption,
  isValueInListOptions,
  normListSelectValue,
} from "@/lib/ui/list-select-utils";

export type GlobalSelectOption = ListSelectItem;

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
    "aria-label": ariaLabel,
  } = props;

  const itemsMode = "items" in props && props.items != null;
  const items = itemsMode ? props.items : undefined;
  const options = !itemsMode ? props.options : undefined;

  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listboxId = `${inputId}-listbox`;
  const fieldClass = fieldClassForVariant(variant, inputClassName);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [touched, setTouched] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const selectedItem = useMemo(
    () => (items ? findItemByValue(value, items) : null),
    [items, value],
  );

  const displayValue = useMemo(() => {
    if (itemsMode) {
      if (focused) return query;
      return selectedItem?.label ?? "";
    }
    return value;
  }, [itemsMode, focused, query, selectedItem, value]);

  const stringSuggestions = useMemo(() => {
    if (!options) return [];
    return filterListSelectSuggestions(focused ? query : value, options);
  }, [options, focused, query, value]);

  const itemSuggestions = useMemo(() => {
    if (!items) return [];
    return filterItemSelectSuggestions(focused ? query : selectedItem?.label ?? "", items);
  }, [items, focused, query, selectedItem]);

  const suggestions = itemsMode ? itemSuggestions : stringSuggestions;

  const isValid = useMemo(() => {
    if (!strictFromList) return true;
    if (!value.trim()) return !required;
    if (itemsMode && items) return isValueInItems(value, items);
    if (options) return isValueInListOptions(value, options);
    return true;
  }, [strictFromList, value, required, itemsMode, items, options]);

  const showInvalid = (touched || forceInvalid) && !isValid;
  const showDropdown = open && !disabled && !isLoading;
  const listEmpty = !isLoading && suggestions.length === 0;

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
        setFocused(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const selectString = useCallback(
    (option: string, advanceFocus = true) => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      onChange(option);
      setOpen(false);
      setActiveIndex(-1);
      setTouched(true);
      setQuery("");
      setFocused(false);
      if (advanceFocus) scheduleFocusNextGestionaleField(inputRef.current);
    },
    [onChange],
  );

  const selectItem = useCallback(
    (item: ListSelectItem, advanceFocus = true) => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      onChange(item.value);
      setOpen(false);
      setActiveIndex(-1);
      setTouched(true);
      setQuery("");
      setFocused(false);
      if (advanceFocus) scheduleFocusNextGestionaleField(inputRef.current);
    },
    [onChange],
  );

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      setFocused(false);
      setQuery("");
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
    if (itemsMode && items && query.trim()) {
      const byLabel = findItemByLabel(query, items);
      if (byLabel) {
        selectItem(byLabel);
        return;
      }
    }
    if (options) {
      const exact = findExactListOption(itemsMode ? query : value, options);
      if (exact) {
        selectString(exact);
        return;
      }
    }
    scheduleFocusNextGestionaleField(inputRef.current);
  };

  const commitBlur = () => {
    setOpen(false);
    setActiveIndex(-1);
    setTouched(true);
    setFocused(false);
    if (!strictFromList) {
      setQuery("");
      return;
    }
    if (itemsMode && items) {
      if (query.trim()) {
        const byLabel = findItemByLabel(query, items);
        if (byLabel) onChange(byLabel.value);
        else if (!value.trim()) onChange("");
      }
      setQuery("");
      return;
    }
    if (options && value.trim()) {
      const exact = findExactListOption(value, options);
      if (exact && exact !== value) onChange(exact);
    }
    setQuery("");
  };

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
          if (itemsMode) setQuery(next);
          else onChange(next);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
          if (itemsMode) setQuery(selectedItem?.label ?? "");
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
        aria-expanded={showDropdown && (suggestions.length > 0 || listEmpty)}
        aria-controls={listboxId}
        aria-invalid={showInvalid || undefined}
        aria-autocomplete="list"
        aria-busy={isLoading || undefined}
      />
      {showDropdown && suggestions.length > 0 ? (
        <ul id={listboxId} role="listbox" className={globalInputDropdownPanel}>
          {suggestions.map((entry, idx) => {
            const active = idx === activeIndex;
            if (itemsMode) {
              const item = entry as ListSelectItem;
              const selected = item.value === value;
              return (
                <li key={item.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={globalInputDropdownOptionClass(active, selected)}
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
              <li key={option} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={globalInputDropdownOptionClass(active, selected)}
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
      {showDropdown && listEmpty ? (
        <div
          id={listboxId}
          role="status"
          className={`${globalInputDropdownPanel} px-3 py-2.5 text-xs font-medium text-[color:var(--cab-text-muted)]`}
        >
          {emptyMessage}
        </div>
      ) : null}
      {showInvalid ? (
        <p className="mt-1 text-[11px] font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]">
          {invalidMessage}
        </p>
      ) : null}
    </div>
  );
}
