"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import {
  findExactMezzoForIngressoIdent,
  mezzoIngressoSuggestLabel,
  splitIdentHighlight,
  suggestMezziForIngressoIdent,
  type SchedaIngressoIdentField,
} from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  globalAutocompleteDropdownPortalPanel,
  globalAutocompleteOptionClass,
  globalInputFieldDefault,
} from "@/lib/ui/global-input";

function IdentHighlight({ text, query }: { text: string; query: string }) {
  const parts = splitIdentHighlight(text, query);
  if (!parts) return <>{text}</>;
  return (
    <>
      {parts.before}
      <mark className="rounded bg-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)] px-0.5 font-semibold text-[color:var(--cab-text)]">
        {parts.match}
      </mark>
      {parts.after}
    </>
  );
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
  onChange: (value: string) => void;
  /** Chiamato quando targa/matricola corrisponde a un mezzo registrato. */
  onExactMezzoMatch: (mezzo: MezzoGestito) => void;
}) {
  const autoId = useId();
  const listboxId = `${autoId}-listbox`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipBlurMatch = useRef(false);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(
    () => suggestMezziForIngressoIdent(mezzi, field, focused ? value : value),
    [mezzi, field, value, focused],
  );

  const showDropdown = open && !readOnly && !disabled && suggestions.length > 0;

  const { style: portalStyle, scrollInside, placementOriginClass } = useGlobalDropdownPortal({
    open: showDropdown,
    anchorRef: wrapRef,
    contentRef: dropdownRef,
    repositionDeps: [suggestions.length, value],
  });

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    setFocused(false);
  }, []);

  useDropdownOutsideDismiss(showDropdown, wrapRef, dropdownRef, close);

  const pickMezzo = useCallback(
    (mezzo: MezzoGestito) => {
      skipBlurMatch.current = true;
      const ident =
        field === "targa"
          ? mezzo.targa?.trim() ?? ""
          : field === "matricola"
            ? mezzo.matricola?.trim() ?? ""
            : mezzo.numeroScuderia?.trim() ?? "";
      onChange(ident);
      close();
      onExactMezzoMatch(mezzo);
    },
    [close, field, onChange, onExactMezzoMatch],
  );

  const tryExactMatchOnBlur = useCallback(() => {
    if (skipBlurMatch.current) {
      skipBlurMatch.current = false;
      return;
    }
    const hit = findExactMezzoForIngressoIdent(mezzi, field, value, siblingIdent);
    if (hit) onExactMezzoMatch(hit);
  }, [field, mezzi, onExactMezzoMatch, siblingIdent, value]);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      close();
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
    if (e.key === "Enter" && open && suggestions.length) {
      e.preventDefault();
      const idx = activeIndex >= 0 ? activeIndex : 0;
      pickMezzo(suggestions[idx]!);
    }
  };

  const identPreview = (mezzo: MezzoGestito) => {
    const ident =
      field === "targa"
        ? mezzo.targa?.trim() ?? ""
        : field === "matricola"
          ? mezzo.matricola?.trim() ?? ""
          : mezzo.numeroScuderia?.trim() ?? "";
    return ident || "—";
  };

  const dropdownPortal =
    showDropdown && portalStyle ? (
      <ul
        ref={dropdownRef}
        id={listboxId}
        role="listbox"
        style={portalStyle}
        className={`${globalAutocompleteDropdownPortalPanel} p-1 ${placementOriginClass} ${
          scrollInside ? "overflow-y-auto" : "overflow-hidden"
        }`}
      >
        {suggestions.map((mezzo, idx) => {
          const active = idx === activeIndex;
          const ident = identPreview(mezzo);
          return (
            <li key={mezzo.id} role="presentation" className="py-0.5">
              <button
                type="button"
                role="option"
                aria-selected={active}
                className={globalAutocompleteOptionClass(active)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  pickMezzo(mezzo);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <span className="block font-medium text-[color:var(--cab-text)]">
                  <IdentHighlight text={ident} query={value} />
                </span>
                <span className="mt-0.5 block text-[10px] font-normal text-[color:var(--cab-text-muted)]">
                  {mezzoIngressoSuggestLabel(mezzo)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <label className={`block text-xs ${className}`.trim()}>
      <span className="text-zinc-500">{label}</span>
      <div ref={wrapRef} className="relative mt-1">
        <input
          ref={inputRef}
          className={`${globalInputFieldDefault} font-mono`}
          readOnly={readOnly}
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            blurTimer.current = setTimeout(() => {
              close();
              tryExactMatchOnBlur();
            }, 140);
          }}
          onKeyDown={onInputKeyDown}
          placeholder={
            field === "targa" ? "Cerca targa…" : field === "matricola" ? "Cerca matricola…" : "Cerca scuderia…"
          }
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
        />
        {typeof document !== "undefined" && dropdownPortal ? createPortal(dropdownPortal, document.body) : null}
      </div>
    </label>
  );
}
