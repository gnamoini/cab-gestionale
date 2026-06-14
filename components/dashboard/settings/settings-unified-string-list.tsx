"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SettingsEliminaConfirmDialog } from "@/components/dashboard/settings-elimina-confirm-dialog";
import {
  SETTINGS_SECTION_HINT,
  SettingsEditableStringRow,
  SettingsEmptyState,
  SettingsListBody,
  SettingsListSection,
  SettingsListToolbar,
  SETTINGS_LIST_DIVIDER_UL,
  SETTINGS_LIST_DIVIDER_UL_SPACED,
  type SettingsSectionLayout,
} from "@/components/dashboard/settings-list-ui";
import { commitSettingsListDelete } from "@/lib/settings/settings-list-delete";
import { filterSettingsStringList } from "@/lib/settings/settings-list-search";
import { useSettingsSimilarGate } from "@/components/dashboard/use-settings-similar-gate";

const SETTINGS_DRAFT_ROW_KEY = "__settings-draft__";

export function SettingsUnifiedStringList({
  title,
  description,
  values,
  placeholder,
  addAriaLabel,
  onAdd,
  onRemove,
  onRename,
  renderRowTrailing,
  layout = "flat",
}: {
  title: string;
  description?: string;
  values: readonly string[];
  placeholder: string;
  addAriaLabel?: string;
  onAdd: (trimmed: string) => void;
  onRemove: (v: string) => void;
  onRename?: (from: string, to: string) => void;
  /** Contenuto opzionale a destra del nome (es. chip sconto %). */
  renderRowTrailing?: (value: string) => ReactNode;
  layout?: SettingsSectionLayout;
}) {
  const [q, setQ] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const { gate, similarDialog } = useSettingsSimilarGate();
  const filtered = useMemo(() => filterSettingsStringList(values, q), [values, q]);
  const listUlClass = layout === "flat" ? SETTINGS_LIST_DIVIDER_UL : SETTINGS_LIST_DIVIDER_UL_SPACED;

  const tryAdd = (raw: string) => {
    gate(values, raw, undefined, () => {
      onAdd(raw.trim());
      setDraftOpen(false);
    });
  };

  const tryRename = (from: string, next: string) => {
    const t = next.trim();
    if (!t || t === from) return;
    gate(values, t, from, () => onRename?.(from, t));
  };

  const draftPlaceholder = addAriaLabel ?? placeholder;
  const showList = draftOpen || filtered.length > 0;

  return (
    <SettingsListSection layout={layout} title={title} description={layout === "card" ? description : undefined}>
      {layout === "flat" && description ? (
        <p className={`${SETTINGS_SECTION_HINT} mt-0 max-w-2xl`}>{description}</p>
      ) : null}
      <SettingsListToolbar
        onStartAdd={() => setDraftOpen(true)}
        addDisabled={draftOpen}
        searchValue={q}
        onSearchChange={setQ}
        searchAriaLabel={`Filtra elenco: ${title}`}
      />
      <SettingsListBody
        layout={layout}
        showList={showList}
        empty={
          <SettingsEmptyState inline={layout === "flat"}>
            Nessun elemento. Usa Aggiungi per inserire il primo.
          </SettingsEmptyState>
        }
      >
        <ul className={listUlClass}>
          {draftOpen ? (
            <SettingsEditableStringRow
              key={SETTINGS_DRAFT_ROW_KEY}
              draft
              value=""
              placeholder={draftPlaceholder}
              onRenameBlur={(_, next) => tryAdd(next)}
              onDraftCancel={() => setDraftOpen(false)}
              onRemove={() => setDraftOpen(false)}
            />
          ) : null}
          {filtered.map((m) => (
            <SettingsEditableStringRow
              key={m}
              value={m}
              onRenameBlur={tryRename}
              onRemove={() => setPendingDelete(m)}
              trailing={renderRowTrailing?.(m)}
            />
          ))}
        </ul>
      </SettingsListBody>
      {similarDialog}
      <SettingsEliminaConfirmDialog
        open={pendingDelete != null}
        itemLabel={pendingDelete ?? undefined}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => commitSettingsListDelete(pendingDelete, onRemove, () => setPendingDelete(null))}
      />
    </SettingsListSection>
  );
}
