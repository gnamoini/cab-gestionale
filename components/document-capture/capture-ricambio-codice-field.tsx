"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import {
  findExactRicambioByCodice,
  suggestRicambiCodiciForCapture,
} from "@/lib/document-capture/capture-ricambi-codice-suggest";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { globalAutocompleteDropdownPortalPanel } from "@/lib/ui/global-input";
import { dsInput } from "@/lib/ui/design-system";

const SUGGEST_ITEM =
  "flex w-full min-w-0 flex-col gap-0.5 rounded-[var(--ds-radius-md)] px-2.5 py-2 text-left transition-colors hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface-2))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)]";

export function CaptureRicambioCodiceField({
  value,
  magazzino,
  readOnly,
  className = "",
  inputClassName = dsInput,
  onChange,
  onPick,
  onBlurExactMatch,
  onFocus,
  onBlur,
}: {
  value: string;
  magazzino: readonly RicambioMagazzino[];
  readOnly?: boolean;
  className?: string;
  inputClassName?: string;
  onChange: (value: string) => void;
  onPick?: (item: RicambioMagazzino, codiceUi: string) => void;
  onBlurExactMatch?: (item: RicambioMagazzino) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const focusedRef = useRef(false);
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(
    () =>
      focused && !readOnly && value.trim()
        ? suggestRicambiCodiciForCapture(value, magazzino, 8)
        : [],
    [focused, magazzino, readOnly, value],
  );

  const showDropdown = focused && value.trim().length > 0 && suggestions.length > 0;

  const { style: portalStyle, scrollInside, placementOriginClass } = useGlobalDropdownPortal({
    open: showDropdown,
    anchorRef: wrapRef,
    contentRef: panelRef,
    repositionDeps: [suggestions.length, value],
  });

  const dismiss = useCallback(() => {
    if (!focusedRef.current) return;
    focusedRef.current = false;
    setFocused(false);
    const exact = findExactRicambioByCodice(value, magazzino);
    if (exact) onBlurExactMatch?.(exact);
    onBlur?.();
  }, [magazzino, onBlur, onBlurExactMatch, value]);

  useDropdownOutsideDismiss(showDropdown, wrapRef, panelRef, dismiss);

  const pickSuggestion = useCallback(
    (item: RicambioMagazzino, codiceUi: string) => {
      onChange(codiceUi);
      onPick?.(item, codiceUi);
      focusedRef.current = false;
      setFocused(false);
    },
    [onChange, onPick],
  );

  if (readOnly) {
    return <span className={inputClassName}>{value || "—"}</span>;
  }

  const menu =
    showDropdown && portalStyle ? (
      <ul
        ref={panelRef}
        id={listboxId}
        role="listbox"
        style={portalStyle}
        className={`${globalAutocompleteDropdownPortalPanel} p-1 ${placementOriginClass} ${
          scrollInside ? "overflow-y-auto gestionale-scrollbar" : "overflow-hidden"
        }`}
      >
        {suggestions.map((s) => (
          <li key={s.item.id} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={false}
              aria-label={s.label}
              className={SUGGEST_ITEM}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => pickSuggestion(s.item, s.codiceUi)}
            >
              <span className="font-mono text-xs font-semibold tracking-wide text-[color:var(--cab-fg)]">
                {s.codiceUi}
              </span>
              {s.descrizione ? (
                <span className="line-clamp-2 text-xs leading-snug text-[color:var(--cab-text-muted)]">
                  {s.descrizione}
                </span>
              ) : null}
              {s.item.marca?.trim() ? (
                <span className="text-[10px] font-medium uppercase tracking-wide text-[color:color-mix(in_srgb,var(--cab-text-muted)_88%,transparent)]">
                  {s.item.marca.trim()}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div ref={wrapRef} className={`relative min-w-0 max-md:overflow-visible ${className}`}>
      <input
        id={inputId}
        role="combobox"
        className={`${inputClassName} w-full min-w-0`}
        value={value}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          onChange(e.target.value);
          focusedRef.current = true;
          setFocused(true);
        }}
        onFocus={() => {
          focusedRef.current = true;
          setFocused(true);
          onFocus?.();
        }}
        placeholder="Codice"
        aria-label="Codice ricambio"
        aria-autocomplete="list"
        aria-controls={showDropdown ? listboxId : undefined}
        aria-expanded={showDropdown}
      />
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
