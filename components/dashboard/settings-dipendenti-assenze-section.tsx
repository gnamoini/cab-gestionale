"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { LIST_DIVIDER_UL } from "@/lib/ui/list-primitives";
import { Tooltip } from "@/components/ui";

import { SettingsEliminaConfirmDialog } from "@/components/dashboard/settings-elimina-confirm-dialog";
import {
  SettingsEmptyState,
  SettingsListBody,
  SettingsListSection,
  SettingsListToolbar,
  SettingsRowActionButtons,
  useSettingsRowCommitOnPointerDownOutside,
  type SettingsSectionLayout,
} from "@/components/dashboard/settings-list-ui";
import { useSettingsSimilarGate } from "@/components/dashboard/use-settings-similar-gate";
import { commitSettingsListDelete } from "@/lib/settings/settings-list-delete";
import { createTipoAssenzaId, isAltroTipoAssenzaLabel, type TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import { SETTINGS_LIST_INPUT_EDIT } from "@/lib/ui/settings-list-tokens";
import { dsFocus } from "@/lib/ui/design-system";
import { gestionaleListTableRowBaseClass } from "@/lib/ui/gestionale-list-table";

const ASSENZE_SETTINGS_TABLE_CLASS =
  "grid w-full min-w-0 grid-cols-1 gap-x-2 sm:grid-cols-[minmax(3.5rem,4.5rem)_minmax(0,1fr)_minmax(4.75rem,6rem)_auto]";

const ASSENZE_SETTINGS_ROW_CLASS = `${gestionaleListTableRowBaseClass} col-span-full grid min-h-11 min-w-0 grid-cols-1 gap-x-2 gap-y-2 border-[color:var(--cab-border)] px-3 py-2 sm:grid-cols-subgrid sm:items-center sm:gap-y-0 sm:px-4`;

const ASSENZE_EDIT_INPUT_CLASS = `${SETTINGS_LIST_INPUT_EDIT} w-full min-w-0`;

const ASSENZE_VIEW_CELL_CLASS = `flex min-h-11 min-w-0 w-full items-center rounded-md px-1 text-left text-sm font-medium touch-manipulation [-webkit-tap-highlight-color:transparent] ${dsFocus}`;

const ASSENZE_DRAFT_ROW_KEY = "__assenze-draft__";

const ASSENZA_ALTRO_MOTIVO_TOOLTIP = "Obbligatorio scrivere\nmotivo dell'assenza";

const ASSENZE_CUSTOM_TEXT_CELL_PLACEHOLDER = "min-h-11 min-w-[4.75rem] max-sm:hidden";

const ASSENZE_ALTRO_MOTIVO_HINT_CLASS =
  "flex min-h-11 min-w-0 cursor-help items-center justify-center px-0.5 text-center text-[10px] font-medium leading-tight text-[color:var(--cab-text-muted)] underline decoration-[color:color-mix(in_srgb,var(--cab-text-muted)_40%,transparent)] decoration-dotted underline-offset-2 select-none max-sm:justify-start sm:min-w-[4.75rem]";

function AssenzaAltroMotivoHint() {
  return (
    <Tooltip
      content={ASSENZA_ALTRO_MOTIVO_TOOLTIP}
      multiline
      side="top"
      showOnFocus={false}
      delayMs={220}
    >
      <span
        role="note"
        className={ASSENZE_ALTRO_MOTIVO_HINT_CLASS}
        aria-label="Obbligatorio scrivere motivo dell'assenza"
      >
        Richiede motivi
      </span>
    </Tooltip>
  );
}

function sortTipiAssenza(tipi: readonly TipoAssenzaConfig[]): TipoAssenzaConfig[] {
  return [...tipi].sort((a, b) => a.sortOrder - b.sortOrder);
}

function filterTipiAssenza(tipi: readonly TipoAssenzaConfig[], query: string): TipoAssenzaConfig[] {
  const sorted = sortTipiAssenza(tipi);
  const q = query.trim().toLowerCase();
  if (!q) return sorted;
  return sorted.filter(
    (t) => t.label.toLowerCase().includes(q) || t.abbrev.toLowerCase().includes(q),
  );
}

function AssenzaDraftRow({
  onConfirm,
  onCancel,
}: {
  onConfirm: (label: string, abbrev: string, requiresCustomText: boolean) => void;
  onCancel: () => void;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
  const abbrevRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    labelRef.current?.focus();
  }, []);

  const commit = useCallback(() => {
    const label = labelRef.current?.value.trim() ?? "";
    if (!label) {
      onCancel();
      return;
    }
    const abbrevRaw = abbrevRef.current?.value.trim() ?? "";
    const abbrev = (abbrevRaw || label.slice(0, 3)).slice(0, 6).toUpperCase();
    onConfirm(label, abbrev, isAltroTipoAssenzaLabel(label));
  }, [onCancel, onConfirm]);

  useSettingsRowCommitOnPointerDownOutside(true, rowRef, commit);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <li ref={rowRef} className={ASSENZE_SETTINGS_ROW_CLASS}>
      <input
        ref={abbrevRef}
        className={`${ASSENZE_EDIT_INPUT_CLASS} font-mono uppercase`}
        placeholder="Sigla"
        maxLength={6}
        autoComplete="off"
        spellCheck={false}
        aria-label="Sigla nuovo tipo assenza"
        onKeyDown={handleKeyDown}
      />
      <input
        ref={labelRef}
        className={ASSENZE_EDIT_INPUT_CLASS}
        placeholder="Nome, es. Formazione"
        autoComplete="off"
        spellCheck={false}
        aria-label="Nome nuovo tipo assenza"
        onKeyDown={handleKeyDown}
      />
      <span className={ASSENZE_CUSTOM_TEXT_CELL_PLACEHOLDER} aria-hidden />
      <SettingsRowActionButtons
        className="w-full sm:w-auto sm:justify-self-end"
        mode="edit"
        itemLabel="nuovo tipo assenza"
        onEdit={() => labelRef.current?.focus()}
        onConfirm={commit}
        onCancelEdit={onCancel}
        onRemove={onCancel}
      />
    </li>
  );
}

function AssenzaSettingsRow({
  tipo,
  onUpdate,
  onRemove,
}: {
  tipo: TipoAssenzaConfig;
  onUpdate: (id: string, patch: Partial<Pick<TipoAssenzaConfig, "label" | "abbrev" | "requiresCustomText">>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editFocus, setEditFocus] = useState<"abbrev" | "label">("label");
  const [abbrev, setAbbrev] = useState(tipo.abbrev);
  const [label, setLabel] = useState(tipo.label);
  const rowRef = useRef<HTMLLIElement>(null);
  const abbrevInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAbbrev(tipo.abbrev);
    setLabel(tipo.label);
  }, [tipo.abbrev, tipo.id, tipo.label]);

  const startEdit = useCallback((field: "abbrev" | "label") => {
    setEditFocus(field);
    setEditing(true);
  }, []);

  useEffect(() => {
    if (!editing) return;
    const target = editFocus === "abbrev" ? abbrevInputRef.current : labelInputRef.current;
    target?.focus({ preventScroll: true });
  }, [editFocus, editing]);

  const commitEdit = useCallback(() => {
    const labelTrim = label.trim();
    const abbrevTrim = abbrev.trim().slice(0, 6).toUpperCase();
    if (!labelTrim || !abbrevTrim) {
      setAbbrev(tipo.abbrev);
      setLabel(tipo.label);
      setEditing(false);
      return;
    }
    const patch: Partial<Pick<TipoAssenzaConfig, "label" | "abbrev" | "requiresCustomText">> = {};
    if (labelTrim !== tipo.label) patch.label = labelTrim;
    if (abbrevTrim !== tipo.abbrev) patch.abbrev = abbrevTrim;
    if (Object.keys(patch).length > 0) onUpdate(tipo.id, patch);
    setEditing(false);
  }, [abbrev, label, onUpdate, tipo.abbrev, tipo.id, tipo.label]);

  const cancelEdit = useCallback(() => {
    setAbbrev(tipo.abbrev);
    setLabel(tipo.label);
    setEditing(false);
  }, [tipo.abbrev, tipo.label]);

  useSettingsRowCommitOnPointerDownOutside(editing, rowRef, commitEdit);

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <li ref={rowRef} className={ASSENZE_SETTINGS_ROW_CLASS}>
      {editing ? (
        <>
          <input
            ref={abbrevInputRef}
            className={`${ASSENZE_EDIT_INPUT_CLASS} font-mono uppercase`}
            value={abbrev}
            maxLength={6}
            autoComplete="off"
            spellCheck={false}
            aria-label={`Sigla ${tipo.label}`}
            onChange={(e) => setAbbrev(e.target.value.slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") e.stopPropagation();
              handleInputKeyDown(e);
            }}
          />
          <input
            ref={labelInputRef}
            className={ASSENZE_EDIT_INPUT_CLASS}
            value={label}
            autoComplete="off"
            spellCheck={false}
            aria-label={`Nome ${tipo.label}`}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") e.stopPropagation();
              handleInputKeyDown(e);
            }}
          />
        </>
      ) : (
        <>
          <button
            type="button"
            className={`${ASSENZE_VIEW_CELL_CLASS} font-mono text-xs uppercase text-[color:var(--cab-text)]`}
            onClick={() => startEdit("abbrev")}
            aria-label={`Modifica sigla ${tipo.abbrev}`}
          >
            <span className="min-w-0 truncate">{tipo.abbrev}</span>
          </button>
          <button
            type="button"
            className={`${ASSENZE_VIEW_CELL_CLASS} text-[color:var(--cab-text)]`}
            onClick={() => startEdit("label")}
            aria-label={`Modifica nome ${tipo.label}`}
          >
            <span className="min-w-0 truncate">{tipo.label}</span>
          </button>
        </>
      )}
      {isAltroTipoAssenzaLabel(tipo.label) ? (
        <AssenzaAltroMotivoHint />
      ) : (
        <span className={ASSENZE_CUSTOM_TEXT_CELL_PLACEHOLDER} aria-hidden />
      )}
      <SettingsRowActionButtons
        className="w-full sm:w-auto sm:justify-self-end"
        mode={editing ? "edit" : "view"}
        itemLabel={tipo.label}
        onEdit={() => startEdit("label")}
        onConfirm={commitEdit}
        onCancelEdit={cancelEdit}
        onRemove={onRemove}
      />
    </li>
  );
}

export function SettingsDipendentiAssenzeSection({
  layout = "flat",
  tipi,
  onChange,
}: {
  layout?: SettingsSectionLayout;
  tipi: TipoAssenzaConfig[];
  onChange: (next: TipoAssenzaConfig[]) => void;
}) {
  const [draftOpen, setDraftOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<TipoAssenzaConfig | null>(null);
  const { gate, similarDialog } = useSettingsSimilarGate();

  const filtered = useMemo(() => filterTipiAssenza(tipi, searchQuery), [tipi, searchQuery]);
  const showList = draftOpen || filtered.length > 0;
  const existingLabels = useMemo(() => tipi.map((t) => t.label), [tipi]);

  const tryAdd = useCallback(
    (label: string, abbrev: string, requiresCustomText: boolean) => {
      gate(existingLabels, label, undefined, () => {
        onChange([
          ...tipi,
          {
            id: createTipoAssenzaId(),
            label: label.trim(),
            abbrev: abbrev.trim().slice(0, 6).toUpperCase(),
            requiresCustomText,
            sortOrder: tipi.length,
          },
        ]);
        setDraftOpen(false);
      });
    },
    [existingLabels, gate, onChange, tipi],
  );

  const tryUpdate = useCallback(
    (id: string, patch: Partial<Pick<TipoAssenzaConfig, "label" | "abbrev" | "requiresCustomText">>) => {
      const current = tipi.find((t) => t.id === id);
      if (!current) return;
      if (patch.label && patch.label !== current.label) {
        gate(existingLabels, patch.label, current.label, () => {
          onChange(tipi.map((t) => (t.id === id ? { ...t, ...patch } : t)));
        });
        return;
      }
      onChange(tipi.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [existingLabels, gate, onChange, tipi],
  );

  return (
    <SettingsListSection layout={layout} title="Tipi assenza dipendenti">
      <SettingsListToolbar
        onStartAdd={() => setDraftOpen(true)}
        addDisabled={draftOpen}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchAriaLabel="Filtra tipi assenza"
        searchPlaceholder="Filtra per sigla o nome…"
      />
      <SettingsListBody
        layout={layout}
        showList={showList}
        empty={
          <SettingsEmptyState inline={layout === "flat"}>
            Nessun tipo assenza. Usa Aggiungi per inserire il primo.
          </SettingsEmptyState>
        }
      >
        <div className={`${ASSENZE_SETTINGS_TABLE_CLASS} ${LIST_DIVIDER_UL}`}>
          {draftOpen ? (
            <ul className="contents">
              <AssenzaDraftRow
                key={ASSENZE_DRAFT_ROW_KEY}
                onConfirm={tryAdd}
                onCancel={() => setDraftOpen(false)}
              />
            </ul>
          ) : null}
          <ul className="contents">
            {filtered.map((t) => (
              <AssenzaSettingsRow
                key={t.id}
                tipo={t}
                onUpdate={tryUpdate}
                onRemove={() => setPendingDelete(t)}
              />
            ))}
          </ul>
        </div>
      </SettingsListBody>
      {similarDialog}
      <SettingsEliminaConfirmDialog
        open={pendingDelete != null}
        itemLabel={pendingDelete?.label}
        detail="I fogli presenze già salvati mantengono la sigla registrata al momento dell'inserimento."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() =>
          commitSettingsListDelete(
            pendingDelete?.id,
            (id) => onChange(tipi.filter((t) => t.id !== id)),
            () => setPendingDelete(null),
          )
        }
      />
    </SettingsListSection>
  );
}
