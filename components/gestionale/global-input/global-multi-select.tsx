"use client";

import { TruncatedTextTooltip } from "@/components/ui";
import { memo, useCallback, useMemo, useState } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input/global-select";
import { dsFocus } from "@/lib/ui/design-system";
import {
  globalMultiSelectChipClass,
  globalMultiSelectChipRemoveClass,
  globalMultiSelectEmbeddedInputClass,
  globalMultiSelectShellClass,
} from "@/lib/ui/global-input";
import type { SelectorDomain } from "@/lib/selector-core/types";

type SelectedChip = { value: string; label?: string; title?: string };

export const GlobalMultiSelect = memo(function GlobalMultiSelect({
  ariaLabel,
  placeholder = "Cerca…",
  disabled,
  options,
  selected,
  onAdd,
  onRemove,
  className = "",
  emptyMessage = "Nessun risultato",
  allowAdd = false,
  canAdd = true,
  addPending = false,
  onAddToList,
  selectorDomain,
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
  allowAdd?: boolean;
  canAdd?: boolean;
  addPending?: boolean;
  onAddToList?: (value: string) => Promise<string | null> | string | null;
  selectorDomain?: SelectorDomain;
}) {
  const [draft, setDraft] = useState("");

  const selectedSet = useMemo(() => new Set(selected.map((s) => s.value)), [selected]);
  const filteredOptions = useMemo(() => options.filter((o) => !selectedSet.has(o)), [options, selectedSet]);

  const addValue = useCallback(
    async (v: string): Promise<string | null> => {
      const clean = v.trim();
      if (!clean) return null;
      if (selectedSet.has(clean)) {
        setDraft("");
        return null;
      }

      const inOptions = options.some((o) => o.trim().toLowerCase() === clean.toLowerCase());
      let canonical = clean;
      if (!inOptions && onAddToList) {
        try {
          const added = await onAddToList(clean);
          if (!added) return null;
          canonical = added;
        } catch {
          return null;
        }
      } else if (!inOptions && !allowAdd) {
        return null;
      }

      if (selectedSet.has(canonical)) {
        setDraft("");
        return null;
      }
      onAdd(canonical);
      setDraft("");
      return canonical;
    },
    [allowAdd, onAdd, onAddToList, options, selectedSet],
  );

  const handleSelectChange = useCallback(
    (next: string) => {
      void addValue(next);
    },
    [addValue],
  );

  const handleAddToListCommit = useCallback(
    (v: string) => addValue(v),
    [addValue],
  );

  const selectedSummary =
    selected.length === 1 ? "1 selezionato" : `${selected.length} selezionati`;

  return (
    <div className={className} role="group" aria-label={ariaLabel}>
      <div className={globalMultiSelectShellClass}>
        {selected.length > 0 ? (
          <div
            className="flex min-w-0 flex-wrap gap-1.5 border-b border-[color:var(--cab-border)] px-2.5 pb-1.5 pt-2"
            role="list"
            aria-label={selectedSummary}
          >
            {selected.map((s) => {
              const chipLabel = s.label ?? s.value;
              const chipTitle = s.title ?? chipLabel;
              return (
                <span key={s.value} role="listitem" className={globalMultiSelectChipClass}>
                  <TruncatedTextTooltip text={chipLabel} className="truncate" />
                  <button type="button" aria-label={`Rimuovi ${chipTitle}`} onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
    }} onClick={(e) => {
        e.stopPropagation();
        onRemove(s.value);
    }} className={`${dsFocus} ${globalMultiSelectChipRemoveClass}`} disabled={disabled}>
                    <span aria-hidden>×</span>
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}
        <GlobalSelect
          value={draft}
          onChange={handleSelectChange}
          options={filteredOptions}
          placeholder={placeholder}
          disabled={disabled}
          allowAdd={allowAdd}
          canAdd={canAdd}
          addPending={addPending}
          onAddToList={onAddToList ? handleAddToListCommit : undefined}
          strictFromList={!allowAdd}
          emptyMessage={emptyMessage}
          invalidMessage="Seleziona un valore esistente"
          aria-label={ariaLabel}
          selectorDomain={selectorDomain}
          inputClassName={globalMultiSelectEmbeddedInputClass}
        />
      </div>
    </div>
  );
});
