"use client";

import { useCallback, useMemo, useState } from "react";
import { GlobalMultiSelect } from "@/components/gestionale/global-input/global-multi-select";
import type { HierarchyTreeKey } from "@/lib/mezzi/hierarchy-list-prefs";
import type { GlobalSettingsHierarchyKind } from "@/src/lib/global-list/global-settings-list-keys";
import { useAppendGlobalListValue } from "@/src/hooks/use-append-global-list-value";

type SelectedChip = { value: string; label?: string };

/** Multi-select compatibilità con append inline su gerarchia attrezzature/telai. */
export function CompatHierarchyMultiSelect({
  tree,
  hierarchyKind,
  marcaNome,
  ariaLabel,
  placeholder = "Cerca…",
  disabled,
  options,
  selected,
  onAdd,
  onRemove,
  emptyMessage = "Nessun risultato",
}: {
  tree: HierarchyTreeKey;
  hierarchyKind: GlobalSettingsHierarchyKind;
  marcaNome?: string;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  options: readonly string[];
  selected: readonly SelectedChip[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  emptyMessage?: string;
}) {
  const { append, canAppend, isPending } = useAppendGlobalListValue("mezzi:clienti", {
    hierarchyTree: tree,
    hierarchyKind,
    marcaNome,
  });

  const handleAddToList = useCallback(
    async (raw: string): Promise<string | null> => {
      if (!canAppend) return null;
      return append(raw);
    },
    [append, canAppend],
  );

  const mergedOptions = useMemo(() => {
    const set = new Set(options);
    for (const s of selected) set.add(s.value);
    return [...set].sort((a, b) => a.localeCompare(b, "it"));
  }, [options, selected]);

  return (
    <GlobalMultiSelect
      ariaLabel={ariaLabel}
      placeholder={placeholder}
      disabled={disabled}
      options={mergedOptions}
      selected={selected}
      onAdd={onAdd}
      onRemove={onRemove}
      emptyMessage={emptyMessage}
      allowAdd={canAppend}
      canAdd={canAppend}
      addPending={isPending}
      onAddToList={canAppend ? handleAddToList : undefined}
    />
  );
}
