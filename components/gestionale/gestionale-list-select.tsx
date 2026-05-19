"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { dsInput } from "@/lib/ui/design-system";
import {
  filterListSelectSuggestions,
  findExactListOption,
  isValueInListOptions,
  normListSelectValue,
} from "@/lib/ui/list-select-utils";

export type GestionaleListSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  /** Se true, il valore deve appartenere all'elenco (validazione submit/blur). */
  strictFromList?: boolean;
  /** Messaggio se valore non in elenco. */
  invalidMessage?: string;
  /** Mostra errore esterno (es. submit form). */
  forceInvalid?: boolean;
  onValidityChange?: (valid: boolean) => void;
};

export function GestionaleListSelect({
  value,
  onChange,
  options,
  disabled,
  required,
  placeholder,
  className = "",
  id: idProp,
  strictFromList = true,
  invalidMessage = "Seleziona un valore esistente",
  forceInvalid = false,
  onValidityChange,
}: GestionaleListSelectProps) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listboxId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [touched, setTouched] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => filterListSelectSuggestions(value, options), [options, value]);

  const isValid = useMemo(() => {
    if (!strictFromList) return true;
    if (!value.trim()) return !required;
    return isValueInListOptions(value, options);
  }, [strictFromList, value, required, options]);

  const showInvalid = (touched || forceInvalid) && !isValid;

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const selectOption = useCallback(
    (option: string) => {
      onChange(option);
      setOpen(false);
      setActiveIndex(-1);
      setTouched(true);
    },
    [onChange],
  );

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      setActiveIndex(0);
      e.preventDefault();
      return;
    }
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < suggestions.length) {
      e.preventDefault();
      selectOption(suggestions[activeIndex]!);
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <input
        id={inputId}
        className={`${dsInput}${showInvalid ? " border-[color:color-mix(in_srgb,var(--cab-danger)_55%,var(--cab-border))] ring-1 ring-[color:color-mix(in_srgb,var(--cab-danger)_28%,transparent)]" : ""}`}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => {
            setOpen(false);
            setActiveIndex(-1);
            setTouched(true);
            if (strictFromList && value.trim()) {
              const exact = findExactListOption(value, options);
              if (exact && exact !== value) onChange(exact);
            }
          }, 120);
        }}
        onKeyDown={onInputKeyDown}
        disabled={disabled}
        required={required && !strictFromList}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listboxId}
        aria-invalid={showInvalid || undefined}
        aria-autocomplete="list"
      />
      {open && suggestions.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[var(--ds-z-dropdown,50)] mt-1 max-h-52 overflow-y-auto rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] py-1 shadow-lg gestionale-scrollbar"
        >
          {suggestions.map((option, idx) => {
            const active = idx === activeIndex;
            const selected = normListSelectValue(option) === normListSelectValue(value);
            return (
              <li key={option} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`block w-full px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                    active
                      ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] text-[color:var(--cab-text)]"
                      : "text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)]"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (blurTimer.current) clearTimeout(blurTimer.current);
                    selectOption(option);
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
      {showInvalid ? (
        <p className="mt-1 text-[11px] font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]">
          {invalidMessage}
        </p>
      ) : null}
    </div>
  );
}

export { isValueInListOptions, resolveListSelectValue } from "@/lib/ui/list-select-utils";
