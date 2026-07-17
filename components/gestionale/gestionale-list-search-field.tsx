"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconGestionaleSearchMagnifier,
  type GestionaleSearchFieldProps,
} from "@/components/gestionale/gestionale-search-field";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import {
  globalInputDropdownOptionClass,
  globalInputDropdownPortalPanel,
} from "@/lib/ui/global-input";
import { dsSearchFieldInput } from "@/lib/ui/design-system";
import { scheduleFocusNextGestionaleField } from "@/lib/ui/gestionale-focus-navigation";
import { filterListSelectSuggestions } from "@/lib/ui/list-select-utils";

const iconWrapClass =
  "pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[color:var(--cab-text-muted)] transition-colors duration-200 group-focus-within:text-[color:color-mix(in_srgb,var(--cab-primary)_78%,var(--cab-text-muted))]";

const searchWrapClass =
  "group relative min-h-11 min-w-0 w-full rounded-[var(--ds-radius-lg)] transition-[box-shadow] duration-200 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cab-primary)_12%,transparent)]";

export type GestionaleListSearchFieldProps = Omit<GestionaleSearchFieldProps, "type"> & {
  /** Pool opzionale per suggerimenti live (oltre al testo digitato). */
  suggestionPool?: readonly string[];
  suggestionLimit?: number;
  onFocusChange?: (focused: boolean) => void;
};

export function GestionaleListSearchField({
  className = "",
  wrapperClassName = "",
  value,
  onChange,
  onKeyDown,
  suggestionPool = [],
  suggestionLimit = 8,
  onFocusChange,
  ...rest
}: GestionaleListSearchFieldProps) {
  const autoId = useId();
  const inputId = rest.id ?? autoId;
  const listboxId = `${inputId}-search-suggestions`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);

  const strValue = typeof value === "string" ? value : String(value ?? "");

  const suggestions = useMemo(() => {
    if (!focused) return [];
    const fromPool = filterListSelectSuggestions(strValue, suggestionPool, suggestionLimit);
    if (fromPool.length >= suggestionLimit) return fromPool;
    const merged = [...fromPool];
    const seen = new Set(fromPool.map((s) => s.toLowerCase()));
    for (const s of filterListSelectSuggestions(strValue, [strValue], 1)) {
      if (!seen.has(s.toLowerCase()) && strValue.trim()) {
        merged.push(s);
        seen.add(s.toLowerCase());
      }
    }
    return merged.slice(0, suggestionLimit);
  }, [focused, strValue, suggestionPool, suggestionLimit]);

  const showDropdown = open && focused && suggestions.length > 0;
  const activeDescendantId =
    activeIndex >= 0 && activeIndex < suggestions.length
      ? `${listboxId}-opt-${activeIndex}`
      : undefined;

  const { style: portalStyle, scrollInside, placementOriginClass } = useGlobalDropdownPortal({
    open: showDropdown,
    anchorRef: wrapRef,
    contentRef: dropdownRef,
    repositionDeps: [suggestions.length, strValue],
  });

  const dismissDropdown = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    setFocused(false);
  }, []);

  useDropdownOutsideDismiss(showDropdown, wrapRef, dropdownRef, dismissDropdown);

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);

  const applySuggestion = useCallback(
    (text: string, advanceFocus = true) => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      onChange?.({
        target: { value: text },
      } as React.ChangeEvent<HTMLInputElement>);
      setOpen(false);
      setActiveIndex(-1);
      setFocused(false);
      if (advanceFocus) scheduleFocusNextGestionaleField(inputRef.current);
    },
    [onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!showDropdown && (e.key === "ArrowDown" || e.key === "ArrowUp") && suggestions.length) {
      setOpen(true);
      setActiveIndex(0);
      e.preventDefault();
      return;
    }
    if (showDropdown && suggestions.length) {
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
        const idx = activeIndex >= 0 ? activeIndex : 0;
        applySuggestion(suggestions[idx]!);
        return;
      }
    }
    if (e.key === "Enter") {
      onKeyDown?.(e);
      if (!e.defaultPrevented) {
        e.preventDefault();
        scheduleFocusNextGestionaleField(inputRef.current);
      }
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <div ref={wrapRef} className={`${searchWrapClass} ${wrapperClassName}`.trim()}>
      <span className={iconWrapClass} aria-hidden>
        <IconGestionaleSearchMagnifier />
      </span>
      <input
        id={inputId}
        {...rest}
        ref={inputRef}
        type="search"
        className={`${dsSearchFieldInput} ${className}`.trim()}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={(e) => {
          rest.onFocus?.(e);
          setFocused(true);
          onFocusChange?.(true);
          setOpen(true);
        }}
        onBlur={(e) => {
          rest.onBlur?.(e);
          blurTimer.current = setTimeout(() => {
            setOpen(false);
            setActiveIndex(-1);
            setFocused(false);
            onFocusChange?.(false);
          }, 120);
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? listboxId : undefined}
        aria-activedescendant={activeDescendantId}
        aria-autocomplete="list"
        enterKeyHint="search"
        autoComplete="off"
      />
      {typeof document !== "undefined" && showDropdown && portalStyle ? (
        createPortal(
          <ul
            ref={dropdownRef}
            id={listboxId}
            role="listbox"
            style={portalStyle}
            className={`${globalInputDropdownPortalPanel} py-1 ${placementOriginClass} ${
              scrollInside ? "overflow-y-auto" : "overflow-hidden"
            }`}
          >
            {suggestions.map((option, idx) => {
              const active = idx === activeIndex;
              return (
                <li key={`${option}-${idx}`} role="presentation">
                  <button
                    id={`${listboxId}-opt-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={globalInputDropdownOptionClass(active, false)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (blurTimer.current) clearTimeout(blurTimer.current);
                      applySuggestion(option, false);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    {option}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      ) : null}
    </div>
  );
}
