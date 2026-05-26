"use client";

import { useCallback, useMemo, useState } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input/global-select";
import { dsFocus } from "@/lib/ui/design-system";

type SelectedChip = { value: string; label?: string };

export function GlobalMultiSelect({
  ariaLabel,
  placeholder = "Cerca…",
  disabled,
  options,
  selected,
  onAdd,
  onRemove,
  className = "",
  emptyMessage = "Nessun risultato",
}: {
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  options: readonly string[];
  selected: readonly SelectedChip[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  className?: string;
  emptyMessage?: string;
}) {
  const [draft, setDraft] = useState("");

  const selectedSet = useMemo(() => new Set(selected.map((s) => s.value)), [selected]);
  const filteredOptions = useMemo(() => options.filter((o) => !selectedSet.has(o)), [options, selectedSet]);

  const addValue = useCallback(
    (v: string) => {
      const clean = v.trim();
      if (!clean) return;
      if (selectedSet.has(clean)) {
        setDraft("");
        return;
      }
      onAdd(clean);
      setDraft("");
    },
    [onAdd, selectedSet],
  );

  return (
    <div className={className}>
      <GlobalSelect
        value={draft}
        onChange={addValue}
        options={filteredOptions}
        placeholder={placeholder}
        disabled={disabled}
        allowAdd={false}
        strictFromList
        emptyMessage={emptyMessage}
        invalidMessage="Seleziona un valore esistente"
        aria-label={ariaLabel}
      />

      {selected.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.map((s) => (
            <button
              key={s.value}
              type="button"
              title="Rimuovi"
              onClick={() => onRemove(s.value)}
              className={`${dsFocus} inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-2 text-xs font-medium text-[color:var(--cab-text)] shadow-[var(--cab-shadow-sm)] hover:bg-[var(--cab-hover)] active:bg-[var(--cab-hover)]`}
              disabled={disabled}
            >
              <span className="truncate">{s.label ?? s.value}</span>
              <span className="shrink-0 text-base leading-none text-[color:var(--cab-text-muted)]" aria-hidden>
                ×
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

