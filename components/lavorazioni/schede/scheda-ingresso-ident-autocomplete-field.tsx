"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  findExactMezzoForIngressoIdent,
  mezzoIngressoSuggestLabel,
  splitIdentHighlight,
  suggestMezziForIngressoIdent,
  type SchedaIngressoIdentField,
} from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  globalAutocompleteDropdownPanel,
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
  otherValue = "",
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
  otherValue?: string;
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

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    setFocused(false);
  }, []);

  const pickMezzo = useCallback(
    (mezzo: MezzoGestito) => {
      skipBlurMatch.current = true;
      const ident = field === "targa" ? mezzo.targa?.trim() ?? "" : mezzo.matricola?.trim() ?? "";
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
    const hit = findExactMezzoForIngressoIdent(mezzi, field, value, otherValue);
    if (hit) onExactMezzoMatch(hit);
  }, [field, mezzi, onExactMezzoMatch, otherValue, value]);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [close]);

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
    const ident = field === "targa" ? mezzo.targa?.trim() ?? "" : mezzo.matricola?.trim() ?? "";
    return ident || "—";
  };

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
          placeholder={field === "targa" ? "Cerca targa…" : "Cerca matricola…"}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
        />
        {showDropdown ? (
          <ul id={listboxId} role="listbox" className={`${globalAutocompleteDropdownPanel} p-1`}>
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
        ) : null}
      </div>
    </label>
  );
}
