"use client";

import { useCallback, useMemo } from "react";
import { GlobalMultiSelect } from "@/components/gestionale/global-input/global-multi-select";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input/global-settings-list-select";
import type { HierarchyTreeKey } from "@/lib/mezzi/hierarchy-list-prefs";
import type { GlobalSettingsHierarchyKind } from "@/src/lib/global-list/global-settings-list-keys";
import { useAppendGlobalListValue } from "@/src/hooks/use-append-global-list-value";

type SelectedChip = { value: string; label?: string };

function compatHierarchyPlaceholder(
  tree: HierarchyTreeKey,
  hierarchyKind: GlobalSettingsHierarchyKind,
): string {
  if (hierarchyKind === "marca") {
    return tree === "attrezzature" ? "Cerca marca attrezzatura…" : "Cerca marca telaio…";
  }
  return tree === "attrezzature" ? "Cerca modello attrezzatura…" : "Cerca modello telaio…";
}

/** Select singolo gerarchia attrezzature/telai con append inline (scheda ingresso, anagrafica). */
export function CompatHierarchySelect({
  tree,
  hierarchyKind,
  marcaNome,
  value,
  onChange,
  ariaLabel,
  placeholder,
  disabled,
  required,
  className,
}: {
  tree: HierarchyTreeKey;
  hierarchyKind: GlobalSettingsHierarchyKind;
  marcaNome?: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  return (
    <GlobalSettingsListSelect
      listKey="mezzi:clienti"
      value={value}
      onChange={onChange}
      context={{ hierarchyTree: tree, hierarchyKind, marcaNome }}
      disabled={disabled}
      required={required}
      className={className}
      placeholder={placeholder ?? compatHierarchyPlaceholder(tree, hierarchyKind)}
      allowAdd
      aria-label={ariaLabel}
    />
  );
}

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
