"use client";

import { Tooltip } from "@/components/ui";
import { LIST_DIVIDER_UL } from "@/lib/ui/list-primitives";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { SettingsColorPickerPopover } from "@/components/gestionale/settings-color-picker-popover";
import { IconActionButton } from "@/components/design-system/icon-action-button";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import { addettoDisplayColor } from "@/lib/lavorazioni/addetto-colors-assign";
import { sortAddettiRecordsByNome, type AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import {
  LavorazioneAddettoReadOnlyPill,
  LavorazionePrioritaReadOnlyPill,
  LavorazioneReadOnlyPill,
} from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import {
  SETTINGS_EMPTY_STATE_INLINE,
  SETTINGS_PANEL_SHELL,
  SETTINGS_SECTION_HINT,
  SettingsEmptyState,
  SettingsListBody,
  SettingsListFrame,
  SETTINGS_ROW_ACTIONS_GROUP,
  SettingsListSection,
  SettingsListToolbar,
  SettingsRowActionButtons,
  useSettingsRowCommitOnPointerDownOutside,
  type SettingsSectionLayout,
} from "@/components/dashboard/settings-list-ui";
import { SETTINGS_LIST_INPUT_EDIT } from "@/lib/ui/settings-list-tokens";
import { filterSettingsStringList } from "@/lib/settings/settings-list-search";
import { dsFocus, dsTableActionBtnColorSwatch, dsTableActionBtnColorSwatchOpen, dsTableActionBtnSecondary, dsTableActionGlyph } from "@/lib/ui/design-system";
import { gestionaleListTableRowBaseClass } from "@/lib/ui/gestionale-list-table";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { prioritaLabel } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import type { PrioritaLav, StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { statoPillShellClass } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
/** Contenitore colonne condiviso (insert + righe elenco via subgrid). */
export const ADDETTI_SETTINGS_TABLE_CLASS =
  "grid w-full min-w-0 grid-cols-1 gap-x-2 sm:grid-cols-[minmax(5.5rem,8.5rem)_minmax(5.5rem,8.5rem)_auto]";

/** Riga allineata alle colonne del contenitore — no `flex` (conflitto con grid). */
export const ADDETTI_SETTINGS_ROW_CLASS = `${gestionaleListTableRowBaseClass} col-span-full grid min-h-11 min-w-0 grid-cols-1 gap-x-2 gap-y-2 border-[color:var(--cab-border)] px-3 py-2 sm:grid-cols-subgrid sm:items-center sm:gap-y-0 sm:px-4`;

const ADDETTI_SETTINGS_EDIT_INPUT_CLASS = `${SETTINGS_LIST_INPUT_EDIT} w-full min-w-0`;

const ADDETTI_VIEW_CELL_CLASS = `flex min-h-11 min-w-0 w-full items-center rounded-md px-1 text-left text-sm font-medium touch-manipulation [-webkit-tap-highlight-color:transparent] ${dsFocus}`;

/** Shell addetti in modal legacy (scroll orizzontale su viewport stretti). */
export const ADDETTI_SETTINGS_PANEL_CLASS = "w-full min-w-0 overflow-x-auto";

const ADDETTI_DRAFT_ROW_KEY = "__addetti-draft__";

function addettoSearchLabel(rec: AddettoRecord): string {
  return [rec.nome, rec.cognome].filter(Boolean).join(" ").trim();
}

function filterAddettiRecords(records: readonly AddettoRecord[], query: string): AddettoRecord[] {
  const sorted = sortAddettiRecordsByNome(records);
  const q = query.trim();
  if (!q) return sorted;
  return sorted.filter((rec) => filterSettingsStringList([addettoSearchLabel(rec)], q).length > 0);
}

function AddettiDraftRow({
  onConfirm,
  onCancel,
}: {
  onConfirm: (nome: string, cognome: string | null) => void;
  onCancel: () => void;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
  const nomeRef = useRef<HTMLInputElement>(null);
  const cognomeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nomeRef.current?.focus();
  }, []);

  const commit = useCallback(() => {
    const nome = nomeRef.current?.value.trim() ?? "";
    if (!nome) {
      onCancel();
      return;
    }
    const cognome = cognomeRef.current?.value.trim() || null;
    onConfirm(nome, cognome);
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
    <li ref={rowRef} className={ADDETTI_SETTINGS_ROW_CLASS}>
      <input
        ref={nomeRef}
        className={ADDETTI_SETTINGS_EDIT_INPUT_CLASS}
        placeholder="Nome"
        aria-label="Nome addetto"
        autoComplete="off"
        onKeyDown={handleKeyDown}
      />
      <input
        ref={cognomeRef}
        className={ADDETTI_SETTINGS_EDIT_INPUT_CLASS}
        placeholder="Cognome (opz.)"
        aria-label="Cognome addetto"
        autoComplete="off"
        onKeyDown={handleKeyDown}
      />
      <SettingsRowActionButtons
        className="w-full sm:w-auto sm:justify-self-end"
        mode="edit"
        itemLabel="nuovo addetto"
        onEdit={() => nomeRef.current?.focus()}
        onConfirm={commit}
        onCancelEdit={onCancel}
        onRemove={onCancel}
      />
    </li>
  );
}

export function AddettiSettingsSection({
  embedded = false,
  addettiRecords,
  addettoColors,
  onAddAddetto,
  onChangeAddettoColor,
  onUpdateAddetto,
  onRemove,
  attiviAddetti,
  storicoAddetti,
}: {
  embedded?: boolean;
  addettiRecords: AddettoRecord[];
  addettoColors: Record<string, string>;
  onAddAddetto: (input: { nome: string; cognome?: string | null }) => void;
  onChangeAddettoColor: (nome: string, hex: string) => void;
  onUpdateAddetto: (id: string, patch: { nome?: string; cognome?: string | null }) => void;
  onRemove: (id: string) => void;
  attiviAddetti: Set<string>;
  storicoAddetti: Set<string>;
}) {
  const [draftOpen, setDraftOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = useMemo(
    () => filterAddettiRecords(addettiRecords, searchQuery),
    [addettiRecords, searchQuery],
  );
  const showList = draftOpen || filtered.length > 0;

  const toolbar = (
    <SettingsListToolbar
      onStartAdd={() => setDraftOpen(true)}
      addDisabled={draftOpen}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchAriaLabel="Filtra elenco addetti"
    />
  );

  const listContent = (
    <div className={`${ADDETTI_SETTINGS_TABLE_CLASS} ${LIST_DIVIDER_UL}`}>
      {draftOpen ? (
        <ul className="contents">
          <AddettiDraftRow
            key={ADDETTI_DRAFT_ROW_KEY}
            onConfirm={(nome, cognome) => {
              onAddAddetto({ nome, cognome });
              setDraftOpen(false);
            }}
            onCancel={() => setDraftOpen(false)}
          />
        </ul>
      ) : null}
      <AddettiSettingsList
        addettiRecords={filtered}
        addettoColors={addettoColors}
        onChangeAddettoColor={onChangeAddettoColor}
        onUpdateAddetto={onUpdateAddetto}
        onRemove={onRemove}
        attiviAddetti={attiviAddetti}
        storicoAddetti={storicoAddetti}
      />
    </div>
  );

  const body = (
    <SettingsListBody
      layout="flat"
      showList={showList}
      empty={
        <SettingsEmptyState inline>
          Nessun addetto. Usa Aggiungi per inserire il primo.
        </SettingsEmptyState>
      }
    >
      {listContent}
    </SettingsListBody>
  );

  if (embedded) {
    return (
      <>
        {toolbar}
        {body}
      </>
    );
  }

  return (
    <div className={`${SETTINGS_PANEL_SHELL} ${ADDETTI_SETTINGS_PANEL_CLASS} p-3 sm:p-4`}>
      {toolbar}
      {showList ? (
        <div className={`${ADDETTI_SETTINGS_TABLE_CLASS} mt-3 ${LIST_DIVIDER_UL}`}>
          {draftOpen ? (
            <ul className="contents">
              <AddettiDraftRow
                key={ADDETTI_DRAFT_ROW_KEY}
                onConfirm={(nome, cognome) => {
                  onAddAddetto({ nome, cognome });
                  setDraftOpen(false);
                }}
                onCancel={() => setDraftOpen(false)}
              />
            </ul>
          ) : null}
          <AddettiSettingsList
            addettiRecords={filtered}
            addettoColors={addettoColors}
            onChangeAddettoColor={onChangeAddettoColor}
            onUpdateAddetto={onUpdateAddetto}
            onRemove={onRemove}
            attiviAddetti={attiviAddetti}
            storicoAddetti={storicoAddetti}
          />
        </div>
      ) : (
        <p className={`${SETTINGS_EMPTY_STATE_INLINE} mt-3`}>
          Nessun addetto. Usa Aggiungi per inserire il primo.
        </p>
      )}
    </div>
  );
}

export function AddettiSettingsPanel({
  embedded = false,
  children,
}: {
  embedded?: boolean;
  children: React.ReactNode;
}) {
  if (embedded) {
    return (
      <SettingsListFrame>
        <div className={`${ADDETTI_SETTINGS_TABLE_CLASS} ${LIST_DIVIDER_UL}`}>
          {children}
        </div>
      </SettingsListFrame>
    );
  }
  return (
    <div className={`${SETTINGS_PANEL_SHELL} ${ADDETTI_SETTINGS_PANEL_CLASS}`}>
      <div className={`${ADDETTI_SETTINGS_TABLE_CLASS} ${LIST_DIVIDER_UL}`}>
        {children}
      </div>
    </div>
  );
}

export function ColorSwatchButton({
  value,
  onChange,
  ariaLabel,
  tooltipContent,
}: {
  value: string;
  onChange: (hex: string) => void;
  ariaLabel: string;
  /** Tooltip breve; default «Modifica colore». */
  tooltipContent?: string;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const hex = normalizeHex(value) ?? "#52525b";
  const tip = tooltipContent ?? "Modifica colore";

  return (
    <>
      <Tooltip content={tip} side="top" showOnFocus={false} disabled={open}>
        <button
          ref={anchorRef}
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          className={`${dsTableActionBtnColorSwatch}${open ? ` ${dsTableActionBtnColorSwatchOpen}` : ""}`}
          style={{ backgroundColor: hex }}
          onClick={() => setOpen((o) => !o)}
        />
      </Tooltip>
      <SettingsColorPickerPopover
        open={open}
        anchorRef={anchorRef}
        value={value}
        ariaLabel={ariaLabel}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const STATI_SETTINGS_TABLE_CLASS =
  "grid w-full min-w-0 grid-cols-1 gap-x-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-3";

const STATI_SETTINGS_ROW_CLASS = `${gestionaleListTableRowBaseClass} relative col-span-full grid min-h-12 min-w-0 grid-cols-1 gap-x-2 gap-y-2 border-[color:var(--cab-border)] px-3 py-2.5 sm:grid-cols-subgrid sm:items-center sm:gap-x-3 sm:gap-y-0 sm:px-4 sm:py-3`;

const STATI_REORDER_BTN = `${dsTableActionBtnSecondary} touch-manipulation [-webkit-tap-highlight-color:transparent]`;

function StatiReorderChevronUp({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l4-4 4 4" />
    </svg>
  );
}

function StatiReorderChevronDown({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
    </svg>
  );
}

function StatiReorderControls({
  mode,
  itemLabel,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  mode: "active" | "placeholder";
  itemLabel: string;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  if (mode === "placeholder") {
    return <span className="hidden h-10 w-[4.75rem] shrink-0 sm:block" aria-hidden />;
  }
  return (
    <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label={`Ordine ${itemLabel}`}>
      <IconActionButton
        label={`Sposta su ${itemLabel}`}
        tooltipContent="Sposta su"
        className={STATI_REORDER_BTN}
        disabled={!canMoveUp}
        onClick={onMoveUp}
      >
        <StatiReorderChevronUp />
      </IconActionButton>
      <IconActionButton
        label={`Sposta giù ${itemLabel}`}
        tooltipContent="Sposta giù"
        className={STATI_REORDER_BTN}
        disabled={!canMoveDown}
        onClick={onMoveDown}
      >
        <StatiReorderChevronDown />
      </IconActionButton>
    </div>
  );
}

const STATI_SETTINGS_EDIT_INPUT_CLASS = `${SETTINGS_LIST_INPUT_EDIT} w-full min-w-0`;

const STATI_VIEW_CELL_CLASS = `flex min-h-11 min-w-0 w-full items-center rounded-md px-0 text-left text-sm font-medium touch-manipulation [-webkit-tap-highlight-color:transparent] ${dsFocus}`;

const STATI_DRAFT_ROW_KEY = "__stati-draft__";

function filterStatiList(stati: readonly StatoLavorazioneConfig[], query: string): StatoLavorazioneConfig[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...stati];
  return stati.filter((s) => (s.label || s.id).toLowerCase().includes(q));
}

/** Larghezza pill anteprima condivisa — allineata allo stato con etichetta più lunga. */
function settingsStatiPreviewPillWidthCh(stati: readonly StatoLavorazioneConfig[]): number {
  let maxLen = 0;
  for (const s of stati) {
    maxLen = Math.max(maxLen, (s.label || s.id).trim().length);
  }
  return Math.max(8, maxLen + 2);
}

function StatoDraftRow({ onConfirm, onCancel }: { onConfirm: (label: string) => void; onCancel: () => void }) {
  const rowRef = useRef<HTMLLIElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commit = useCallback(() => {
    const label = inputRef.current?.value.trim() ?? "";
    if (!label) {
      onCancel();
      return;
    }
    onConfirm(label);
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
    <li ref={rowRef} className={STATI_SETTINGS_ROW_CLASS}>
      <StatiReorderControls mode="placeholder" itemLabel="" />
      <input
        ref={inputRef}
        className={STATI_SETTINGS_EDIT_INPUT_CLASS}
        placeholder="Nuovo stato (es. Diagnosi)"
        aria-label="Nome nuovo stato"
        autoComplete="off"
        spellCheck={false}
        onKeyDown={handleKeyDown}
      />
      <SettingsRowActionButtons
        className="w-full sm:w-auto sm:justify-self-end"
        mode="edit"
        itemLabel="nuovo stato"
        onEdit={() => inputRef.current?.focus()}
        onConfirm={commit}
        onCancelEdit={onCancel}
        onRemove={onCancel}
      />
    </li>
  );
}

const StatoSettingsRow = memo(function StatoSettingsRow({
  stato,
  stati,
  canReorder,
  canMoveUp,
  canMoveDown,
  previewPillWidthCh,
  onChangeLabel,
  onChangeStatoColor,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  stato: StatoLavorazioneConfig;
  stati: StatoLavorazioneConfig[];
  canReorder: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  previewPillWidthCh: number;
  onChangeLabel: (id: string, label: string) => void;
  onChangeStatoColor: (id: string, hex: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(stato.label);
  const rowRef = useRef<HTMLLIElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const displayHex = statoDisplayColor(stato.id, stati);
  const pillLabel = (editing ? label : stato.label || stato.id).trim() || "—";

  useEffect(() => {
    setLabel(stato.label);
  }, [stato.id, stato.label]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [editing]);

  const commitEdit = useCallback(() => {
    const labelTrim = label.trim();
    if (!labelTrim) {
      setLabel(stato.label);
      setEditing(false);
      return;
    }
    if (labelTrim !== stato.label) onChangeLabel(stato.id, labelTrim);
    setEditing(false);
  }, [label, onChangeLabel, stato.id, stato.label]);

  const cancelEdit = useCallback(() => {
    setLabel(stato.label);
    setEditing(false);
  }, [stato.label]);

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
    <li ref={rowRef} className={STATI_SETTINGS_ROW_CLASS}>
      <StatiReorderControls
        mode={canReorder ? "active" : "placeholder"}
        itemLabel={stato.label || stato.id}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
      {editing ? (
        <input
          ref={inputRef}
          className={STATI_SETTINGS_EDIT_INPUT_CLASS}
          value={label}
          autoComplete="off"
          spellCheck={false}
          aria-label={`Nome stato ${stato.label || stato.id}`}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleInputKeyDown}
        />
      ) : (
        <button
          type="button"
          className={`${STATI_VIEW_CELL_CLASS} text-[color:var(--cab-text)]`}
          onClick={() => setEditing(true)}
          aria-label={`Modifica nome ${stato.label || stato.id}`}
        >
          <span className="min-w-0 truncate">{stato.label || stato.id}</span>
        </button>
      )}
      <SettingsRowActionButtons
        className="w-full sm:w-auto sm:justify-self-end"
        leading={
          !editing ? (
            <>
              <Tooltip content={"Anteprima pill in tabella e Kanban"}><span className={SETTINGS_PREVIEW_PILL_LEADING_CLASS}>
                <LavorazioneReadOnlyPill label={pillLabel} shellClass={statoPillShellClass()} shellStyle={readablePillStyleFromHex(displayHex)} fullWidth={false} actionRow actionRowUniformWidthCh={previewPillWidthCh}/>
              </span></Tooltip>
              <ColorSwatchButton
                value={displayHex}
                ariaLabel={`Colore stato ${stato.label || stato.id}`}
                tooltipContent={`Modifica colore · ${displayHex.toUpperCase()}`}
                onChange={(hex) => onChangeStatoColor(stato.id, hex)}
              />
            </>
          ) : undefined
        }
        mode={editing ? "edit" : "view"}
        itemLabel={stato.label || stato.id}
        onEdit={() => setEditing(true)}
        onConfirm={commitEdit}
        onCancelEdit={cancelEdit}
        onRemove={onRemove}
      />
    </li>
  );
});

export function StatiSettingsSection({
  layout = "flat",
  stati,
  onAddStatoFromLabel,
  onChangeLabel,
  onChangeStatoColor,
  onRemove,
  onReorder,
}: {
  layout?: SettingsSectionLayout;
  stati: StatoLavorazioneConfig[];
  onAddStatoFromLabel: (label: string) => void;
  onChangeLabel: (id: string, label: string) => void;
  onChangeStatoColor: (id: string, hex: string) => void;
  onRemove: (id: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}) {
  const [draftOpen, setDraftOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = useMemo(() => filterStatiList(stati, searchQuery), [stati, searchQuery]);
  const showList = draftOpen || filtered.length > 0;
  const previewPillWidthCh = useMemo(() => settingsStatiPreviewPillWidthCh(stati), [stati]);
  const canReorder = Boolean(onReorder) && !searchQuery.trim();

  const handleMoveUp = useCallback(
    (index: number) => {
      if (!onReorder || index <= 0) return;
      onReorder(index, index - 1);
    },
    [onReorder],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (!onReorder || index >= stati.length - 1) return;
      onReorder(index, index + 1);
    },
    [onReorder, stati.length],
  );

  const resolveIndex = useCallback(
    (id: string) => stati.findIndex((s) => s.id === id),
    [stati],
  );

  return (
    <SettingsListSection layout={layout} title="Stati lavorazioni">
      <SettingsListToolbar
        onStartAdd={() => setDraftOpen(true)}
        addDisabled={draftOpen}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchAriaLabel="Filtra stati lavorazioni"
        searchPlaceholder="Filtra per nome…"
      />
      <SettingsListBody
        layout={layout}
        showList={showList}
        empty={
          <SettingsEmptyState inline={layout === "flat"}>
            Nessuno stato. Usa Aggiungi per inserire il primo.
          </SettingsEmptyState>
        }
      >
        <div className={`${STATI_SETTINGS_TABLE_CLASS} ${LIST_DIVIDER_UL}`}>
          {draftOpen ? (
            <ul className="contents">
              <StatoDraftRow
                key={STATI_DRAFT_ROW_KEY}
                onConfirm={(label) => {
                  onAddStatoFromLabel(label);
                  setDraftOpen(false);
                }}
                onCancel={() => setDraftOpen(false)}
              />
            </ul>
          ) : null}
          <ul className="contents">
            {filtered.map((s) => {
              const index = resolveIndex(s.id);
              return (
                <StatoSettingsRow
                  key={s.id}
                  stato={s}
                  stati={stati}
                  canReorder={canReorder}
                  canMoveUp={canReorder && index > 0}
                  canMoveDown={canReorder && index < stati.length - 1}
                  previewPillWidthCh={previewPillWidthCh}
                  onChangeLabel={onChangeLabel}
                  onChangeStatoColor={onChangeStatoColor}
                  onRemove={() => onRemove(s.id)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                />
              );
            })}
          </ul>
        </div>
      </SettingsListBody>
    </SettingsListSection>
  );
}

const PRIORITA_LEVELS: PrioritaLav[] = orderPrioritaList(["bassa", "media", "alta", "urgente"]) as PrioritaLav[];

const SETTINGS_PREVIEW_PILL_LEADING_CLASS = "mr-2 sm:mr-3";

const PRIORITA_SECTION_DESCRIPTION =
  "Quattro livelli fissi. Personalizza il colore delle pill in tabella, Kanban e filtri.";

const PRIORITA_SETTINGS_TABLE_CLASS =
  "grid w-full min-w-0 grid-cols-1 gap-x-2 sm:grid-cols-[minmax(0,1fr)_auto]";

const PRIORITA_SETTINGS_ROW_CLASS = `${gestionaleListTableRowBaseClass} col-span-full grid min-h-11 min-w-0 grid-cols-1 gap-x-2 gap-y-2 border-[color:var(--cab-border)] px-3 py-2 sm:grid-cols-subgrid sm:items-center sm:gap-y-0 sm:px-4`;

const PRIORITA_VIEW_CELL_CLASS =
  "flex min-h-11 min-w-0 items-center px-1 text-sm font-medium text-[color:var(--cab-text)]";

function PrioritaSettingsRow({
  priorita,
  prioritaColors,
  onChangePrioritaColor,
}: {
  priorita: PrioritaLav;
  prioritaColors: Partial<Record<PrioritaLav, string>>;
  onChangePrioritaColor: (p: PrioritaLav, hex: string) => void;
}) {
  const label = prioritaLabel(priorita);
  const displayHex =
    priorita === "urgente" ? "#b91c1c" : prioritaDisplayColor(priorita, prioritaColors);

  return (
    <li className={PRIORITA_SETTINGS_ROW_CLASS}>
      <span className={PRIORITA_VIEW_CELL_CLASS}>{label}</span>
      <div
        className={`${SETTINGS_ROW_ACTIONS_GROUP} w-full sm:w-auto sm:justify-self-end`}
        role="group"
        aria-label={`Azioni per priorità ${label}`}
      >
        <Tooltip content={"Anteprima pill in tabella e Kanban"}><span className={SETTINGS_PREVIEW_PILL_LEADING_CLASS}>
          <LavorazionePrioritaReadOnlyPill priorita={priorita} prioritaColors={prioritaColors} fullWidth={false} actionRow actionRowFixedWidth/>
        </span></Tooltip>
        <ColorSwatchButton
          value={displayHex}
          ariaLabel={`Colore priorità ${label}`}
          tooltipContent={`Modifica colore · ${displayHex.toUpperCase()}`}
          onChange={(hex) => onChangePrioritaColor(priorita, hex)}
        />
      </div>
    </li>
  );
}

export function PrioritaSettingsSection({
  layout = "flat",
  prioritaColors,
  onChangePrioritaColor,
}: {
  layout?: SettingsSectionLayout;
  prioritaColors: Partial<Record<PrioritaLav, string>>;
  onChangePrioritaColor: (p: PrioritaLav, hex: string) => void;
}) {
  return (
    <SettingsListSection layout={layout} title="Priorità" description={PRIORITA_SECTION_DESCRIPTION}>
      {layout === "flat" ? (
        <p className={`${SETTINGS_SECTION_HINT} mt-1 max-w-2xl`}>{PRIORITA_SECTION_DESCRIPTION}</p>
      ) : null}
      <SettingsListBody layout={layout} showList empty={null}>
        <div className={`${PRIORITA_SETTINGS_TABLE_CLASS} ${LIST_DIVIDER_UL}`}>
          <ul className="contents">
            {PRIORITA_LEVELS.map((p) => (
              <PrioritaSettingsRow
                key={p}
                priorita={p}
                prioritaColors={prioritaColors}
                onChangePrioritaColor={onChangePrioritaColor}
              />
            ))}
          </ul>
        </div>
      </SettingsListBody>
    </SettingsListSection>
  );
}

const ADDETTO_IN_USE_REMOVE_TOOLTIP =
  "Compare in lavorazioni già registrate; verrà rimosso solo dalle liste future";

function AddettoSettingsRow({
  record,
  addettoColors,
  onChangeAddettoColor,
  onUpdate,
  onRemove,
  inUse,
}: {
  record: AddettoRecord;
  addettoColors: Record<string, string>;
  onChangeAddettoColor: (nome: string, hex: string) => void;
  onUpdate: (id: string, patch: { nome?: string; cognome?: string | null }) => void;
  onRemove: (id: string) => void;
  inUse: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editFocus, setEditFocus] = useState<"nome" | "cognome">("nome");
  const [nome, setNome] = useState(record.nome);
  const [cognome, setCognome] = useState(record.cognome ?? "");
  const rowRef = useRef<HTMLLIElement>(null);
  const nomeInputRef = useRef<HTMLInputElement>(null);
  const cognomeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNome(record.nome);
    setCognome(record.cognome ?? "");
  }, [record.nome, record.cognome, record.id]);

  const startEdit = useCallback((field: "nome" | "cognome") => {
    setEditFocus(field);
    setEditing(true);
  }, []);

  useEffect(() => {
    if (!editing) return;
    const target = editFocus === "cognome" ? cognomeInputRef.current : nomeInputRef.current;
    target?.focus({ preventScroll: true });
  }, [editFocus, editing]);

  const itemLabel = [record.nome, record.cognome].filter(Boolean).join(" ").trim() || record.nome;
  /** In tabella lavorazioni la pill usa il nome (chiave colori), non nome+cognome. */
  const tableAddettoLabel = (editing ? nome : record.nome).trim() || "—";
  const colorKey = (editing ? nome : record.nome).trim() || record.nome;
  const displayHex = addettoDisplayColor(colorKey, addettoColors);

  const commitEdit = useCallback(() => {
    const nomeTrim = nome.trim();
    if (!nomeTrim) {
      setNome(record.nome);
      setCognome(record.cognome ?? "");
      setEditing(false);
      return;
    }
    const cognomeTrim = cognome.trim();
    const prevCognome = (record.cognome ?? "").trim();
    const patch: { nome?: string; cognome?: string | null } = {};
    if (nomeTrim !== record.nome) patch.nome = nomeTrim;
    if (cognomeTrim !== prevCognome) patch.cognome = cognomeTrim || null;
    if (Object.keys(patch).length > 0) onUpdate(record.id, patch);
    setEditing(false);
  }, [cognome, nome, onUpdate, record.cognome, record.id, record.nome]);

  const cancelEdit = useCallback(() => {
    setNome(record.nome);
    setCognome(record.cognome ?? "");
    setEditing(false);
  }, [record.cognome, record.nome]);

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
    <li ref={rowRef} className={ADDETTI_SETTINGS_ROW_CLASS}>
      {editing ? (
        <>
          <input
            ref={nomeInputRef}
            className={ADDETTI_SETTINGS_EDIT_INPUT_CLASS}
            value={nome}
            placeholder="Nome"
            required
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") e.stopPropagation();
              handleInputKeyDown(e);
            }}
            aria-label="Nome addetto"
          />
          <input
            ref={cognomeInputRef}
            className={ADDETTI_SETTINGS_EDIT_INPUT_CLASS}
            value={cognome}
            placeholder="Cognome (opz.)"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setCognome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") e.stopPropagation();
              handleInputKeyDown(e);
            }}
            aria-label="Cognome addetto"
          />
        </>
      ) : (
        <>
          <button
            type="button"
            className={`${ADDETTI_VIEW_CELL_CLASS} text-[color:var(--cab-text)]`}
            onClick={() => startEdit("nome")}
            aria-label={`Modifica nome ${record.nome}`}
          >
            <span className="min-w-0 truncate">{record.nome}</span>
          </button>
          <button
            type="button"
            className={`${ADDETTI_VIEW_CELL_CLASS} ${
              record.cognome?.trim()
                ? "text-[color:var(--cab-text)]"
                : "text-[color:var(--cab-text-muted)]"
            }`}
            onClick={() => startEdit("cognome")}
            aria-label={`Modifica cognome ${record.cognome?.trim() || record.nome}`}
          >
            <span className="min-w-0 truncate">{record.cognome?.trim() || "Cognome (opz.)"}</span>
          </button>
        </>
      )}
      <SettingsRowActionButtons
        className="w-full sm:w-auto sm:justify-self-end"
        leading={
          !editing ? (
            <>
              <Tooltip content={"Anteprima come in tabella lavorazioni"}><span className={SETTINGS_PREVIEW_PILL_LEADING_CLASS}>
                <LavorazioneAddettoReadOnlyPill addetto={tableAddettoLabel} addettoColors={addettoColors} fullWidth={false} actionRow actionRowFixedWidth/>
              </span></Tooltip>
              <ColorSwatchButton
                value={displayHex}
                ariaLabel={`Colore addetto ${tableAddettoLabel}`}
                tooltipContent={`Modifica colore · ${displayHex.toUpperCase()}`}
                onChange={(hex) => onChangeAddettoColor(record.nome, hex)}
              />
            </>
          ) : undefined
        }
        mode={editing ? "edit" : "view"}
        itemLabel={itemLabel}
        onEdit={() => startEdit("nome")}
        onConfirm={commitEdit}
        onCancelEdit={cancelEdit}
        onRemove={() => onRemove(record.id)}
        removeTooltipContent={
          inUse ? `Elimina ${itemLabel}\n${ADDETTO_IN_USE_REMOVE_TOOLTIP}` : undefined
        }
      />
    </li>
  );
}

export function AddettiSettingsList({
  addettiRecords,
  addettoColors,
  onChangeAddettoColor,
  onUpdateAddetto,
  onRemove,
  attiviAddetti,
  storicoAddetti,
}: {
  addettiRecords: AddettoRecord[];
  addettoColors: Record<string, string>;
  onChangeAddettoColor: (nome: string, hex: string) => void;
  onUpdateAddetto: (id: string, patch: { nome?: string; cognome?: string | null }) => void;
  onRemove: (id: string) => void;
  attiviAddetti: Set<string>;
  storicoAddetti: Set<string>;
}) {
  const sorted = useMemo(() => sortAddettiRecordsByNome(addettiRecords), [addettiRecords]);

  if (sorted.length === 0) {
    return null;
  }

  return (
    <ul className="contents">
      {sorted.map((rec) => (
        <AddettoSettingsRow
          key={rec.id}
          record={rec}
          addettoColors={addettoColors}
          onChangeAddettoColor={onChangeAddettoColor}
          onUpdate={onUpdateAddetto}
          onRemove={onRemove}
          inUse={attiviAddetti.has(rec.nome) || storicoAddetti.has(rec.nome)}
        />
      ))}
    </ul>
  );
}
