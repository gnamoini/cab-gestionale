"use client";

import { useMemo, useState } from "react";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { SettingsEliminaConfirmDialog } from "@/components/dashboard/settings-elimina-confirm-dialog";
import {
  SettingsAddRow,
  SettingsEditableStringRow,
  SettingsEmptyState,
  SettingsSectionHeader,
  SETTINGS_LIST_DIVIDER_UL,
  SETTINGS_SECTION_CARD,
} from "@/components/dashboard/settings-list-ui";
import { useSettingsSimilarGate } from "@/components/dashboard/use-settings-similar-gate";
import { sortStringsItCaseInsensitive } from "@/lib/ui/sort-strings-it";

export function SettingsUnifiedStringList({
  title,
  values,
  nuovo,
  setNuovo,
  placeholder,
  addAriaLabel,
  onAdd,
  onRemove,
  onRename,
}: {
  title: string;
  values: readonly string[];
  nuovo: string;
  setNuovo: (v: string) => void;
  placeholder: string;
  addAriaLabel?: string;
  onAdd: (trimmed: string) => void;
  onRemove: (v: string) => void;
  onRename?: (from: string, to: string) => void;
}) {
  const [q, setQ] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const { gate, similarDialog } = useSettingsSimilarGate();
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t ? values.filter((v) => v.toLowerCase().includes(t)) : [...values];
    return sortStringsItCaseInsensitive(base);
  }, [values, q]);

  const tryAdd = (raw: string) => {
    gate(values, raw, undefined, () => {
      onAdd(raw.trim());
      setNuovo("");
    });
  };

  const tryRename = (from: string, next: string) => {
    const t = next.trim();
    if (!t || t === from) return;
    gate(values, t, from, () => onRename?.(from, t));
  };

  return (
    <div className={SETTINGS_SECTION_CARD}>
      <SettingsSectionHeader level="card" title={title} />
      <GestionaleSearchField
        wrapperClassName="mt-2 w-full"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtra elenco…"
        autoComplete="off"
        aria-label={`Filtra elenco: ${title}`}
      />
      <SettingsAddRow
        value={nuovo}
        onChange={setNuovo}
        placeholder={placeholder}
        inputAriaLabel={addAriaLabel ?? placeholder}
        onAdd={() => tryAdd(nuovo)}
      />
      {filtered.length === 0 ? (
        <SettingsEmptyState>Nessun elemento. Aggiungi il primo con il campo sopra.</SettingsEmptyState>
      ) : (
        <ul className={SETTINGS_LIST_DIVIDER_UL}>
          {filtered.map((m) => (
            <SettingsEditableStringRow
              key={m}
              value={m}
              onRenameBlur={tryRename}
              onRemove={() => setPendingDelete(m)}
            />
          ))}
        </ul>
      )}
      {similarDialog}
      <SettingsEliminaConfirmDialog
        open={pendingDelete != null}
        itemLabel={pendingDelete ?? undefined}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onRemove(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
