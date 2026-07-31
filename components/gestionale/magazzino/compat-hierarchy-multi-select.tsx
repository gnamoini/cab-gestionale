"use client";

import { memo, useCallback, useMemo } from "react";
import { GlobalMultiSelect } from "@/components/gestionale/global-input/global-multi-select";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input/global-settings-list-select";
import { compatHierarchyMultiAddValue } from "@/lib/magazzino/compat/compat-hierarchy-add-value";
import { compatLabelMarcaModello, parseCompatMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
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
  id,
  exclusiveGroup,
  onMarcaModelloPick,
  emptyOptionLabel,
  clearable,
  hideEmptyOptionInInput,
}: {
  tree: HierarchyTreeKey;
  hierarchyKind: GlobalSettingsHierarchyKind;
  marcaNome?: string;
  value: string;
  onChange: (value: string) => void;
  /** Con marca vuota: imposta marca + modello da voce «Marca — Modello». */
  onMarcaModelloPick?: (marca: string, modello: string) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  exclusiveGroup?: string;
  emptyOptionLabel?: string;
  clearable?: boolean;
  hideEmptyOptionInInput?: boolean;
}) {
  const marca = marcaNome?.trim() ?? "";
  const modelloBrowseAll = hierarchyKind === "modello" && !marca;

  const selectValue = useMemo(() => {
    if (!modelloBrowseAll || hierarchyKind !== "modello" || !value.trim()) return value;
    if (value.includes(" — ")) return value;
    return marca ? compatLabelMarcaModello(marca, value) : value;
  }, [hierarchyKind, marca, modelloBrowseAll, value]);

  const handleChange = useCallback(
    (picked: string) => {
      if (modelloBrowseAll) {
        const parsed = parseCompatMarcaModello(picked);
        if (parsed.marca && parsed.modello) {
          onMarcaModelloPick?.(parsed.marca, parsed.modello);
          return;
        }
      }
      onChange(picked);
    },
    [modelloBrowseAll, onChange, onMarcaModelloPick],
  );

  return (
    <GlobalSettingsListSelect
      listKey="mezzi:clienti"
      value={selectValue}
      onChange={handleChange}
      context={{ hierarchyTree: tree, hierarchyKind, marcaNome, modelloBrowseAll }}
      disabled={disabled}
      required={required}
      className={className}
      id={id}
      placeholder={placeholder ?? compatHierarchyPlaceholder(tree, hierarchyKind)}
      allowAdd
      exclusiveGroup={exclusiveGroup}
      emptyOptionLabel={emptyOptionLabel}
      clearable={clearable}
      hideEmptyOptionInInput={hideEmptyOptionInInput}
      aria-label={ariaLabel}
    />
  );
}

/** Multi-select compatibilità con append inline su gerarchia attrezzature/telai. */
export const CompatHierarchyMultiSelect = memo(function CompatHierarchyMultiSelect({
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

  const appendEnabled =
    canAppend && (hierarchyKind !== "modello" || Boolean(marcaNome?.trim()));

  const handleCompatAdd = useCallback(
    (value: string) => {
      const line = compatHierarchyMultiAddValue(hierarchyKind, value, marcaNome);
      if (line) onAdd(line);
    },
    [hierarchyKind, marcaNome, onAdd],
  );

  const handleAddToList = useCallback(
    async (raw: string): Promise<string | null> => {
      if (!appendEnabled) return null;
      return append(raw);
    },
    [append, appendEnabled],
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
      onAdd={handleCompatAdd}
      onRemove={onRemove}
      emptyMessage={emptyMessage}
      allowAdd={appendEnabled}
      canAdd={appendEnabled}
      addPending={isPending}
      onAddToList={appendEnabled ? handleAddToList : undefined}
      selectorDomain="magazzino"
    />
  );
});
