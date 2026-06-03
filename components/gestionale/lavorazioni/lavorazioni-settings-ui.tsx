"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SettingsColorPickerPopover } from "@/components/gestionale/settings-color-picker-popover";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import { addettoDisplayColor } from "@/lib/lavorazioni/addetto-colors-assign";
import { sortAddettiRecordsByNome, type AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { PageToolbarCtaLabel } from "@/components/design-system";
import { LavorazioneAddettoReadOnlyPill } from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { lavTableTdPillWrap } from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import { dsInput, dsPageToolbarCtaCompact } from "@/lib/ui/design-system";
import { gestionaleListTableRowBaseClass } from "@/lib/ui/gestionale-list-table";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { STATO_LAVORAZIONE_COMPLETATA_ID } from "@/lib/lavorazioni/stati-dynamic";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
/** Contenitore colonne condiviso (insert + righe elenco via subgrid). */
export const ADDETTI_SETTINGS_TABLE_CLASS =
  "grid w-full min-w-0 grid-cols-1 gap-x-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(6.5rem,1.2fr)_auto]";

/** Riga allineata alle colonne del contenitore — no `flex` (conflitto con grid). */
export const ADDETTI_SETTINGS_ROW_CLASS = `${gestionaleListTableRowBaseClass} col-span-full grid min-h-[2.75rem] min-w-0 grid-cols-1 gap-x-2 gap-y-2 px-2 py-1.5 sm:grid-cols-subgrid sm:items-center sm:gap-y-0 sm:px-3`;

const ADDETTI_SETTINGS_INPUT_CLASS = `${dsInput} h-8 min-h-8 w-full min-w-0 py-1 text-sm`;

const ADDETTI_PREVIEW_COL_CLASS = "flex min-w-0 items-center gap-1.5";

const ADDETTI_PILL_SLOT_CLASS = `${lavTableTdPillWrap} min-w-0 flex-1 overflow-hidden`;

/** Shell addetti: larghezza pannello, scroll orizzontale solo su viewport stretti. */
export const ADDETTI_SETTINGS_PANEL_CLASS = "w-full min-w-0 overflow-x-auto";

/** Azione elimina — colori/hover come `dsTableActionBtnDanger`, formato testo compatto. */
const ADDETTI_DELETE_BTN =
  "inline-flex h-8 min-h-8 shrink-0 items-center rounded-md bg-transparent px-2.5 text-xs font-semibold text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))] opacity-70 transition-[opacity,background-color] duration-150 ease-out group-hover:opacity-100 hover:bg-[color:color-mix(in_srgb,var(--cab-danger)_18%,var(--cab-surface))]";

export function AddettiInsertRow({
  nome,
  cognome,
  onNomeChange,
  onCognomeChange,
  onAdd,
}: {
  nome: string;
  cognome: string;
  onNomeChange: (v: string) => void;
  onCognomeChange: (v: string) => void;
  onAdd: () => void;
}) {
  const canAdd = nome.trim().length > 0;

  const submit = () => {
    if (!canAdd) return;
    onAdd();
  };

  return (
    <div className={ADDETTI_SETTINGS_ROW_CLASS}>
      <input
        className={ADDETTI_SETTINGS_INPUT_CLASS}
        placeholder="Nome"
        aria-label="Nome addetto"
        value={nome}
        onChange={(e) => onNomeChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      />
      <input
        className={ADDETTI_SETTINGS_INPUT_CLASS}
        placeholder="Cognome (opz.)"
        aria-label="Cognome addetto"
        value={cognome}
        onChange={(e) => onCognomeChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className={`${ADDETTI_PREVIEW_COL_CLASS} hidden sm:flex`} aria-hidden>
        <div className={`${ADDETTI_PILL_SLOT_CLASS} opacity-0`}>
          <span className="block h-8" />
        </div>
        <span className="inline-block h-7 w-7 shrink-0" />
      </div>
      <button
        type="button"
        className={`${dsPageToolbarCtaCompact} h-8 min-h-8 w-full shrink-0 px-2 text-xs sm:w-auto sm:justify-self-end`}
        disabled={!canAdd}
        onClick={submit}
      >
        <PageToolbarCtaLabel short="+ Addetto" full="Aggiungi addetto" />
      </button>
    </div>
  );
}

export function ColorSwatchButton({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (hex: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const hex = normalizeHex(value) ?? "#52525b";

  return (
    <div className="relative shrink-0">
      <button
        ref={anchorRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        title={ariaLabel}
        className="h-7 w-7 rounded-md border-2 border-[color:var(--cab-border)] shadow-sm transition hover:ring-2 hover:ring-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)]"
        style={{ backgroundColor: hex }}
        onClick={() => setOpen((o) => !o)}
      />
      <SettingsColorPickerPopover
        open={open}
        anchorRef={anchorRef}
        value={value}
        ariaLabel={ariaLabel}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

export function StatoSettingsList({
  stati,
  onChangeLabel,
  onChangeStatoColor,
  onChangeStatoClosed,
  onRemove,
  onReorder,
  attiviStatoIds,
  storicoStatoIds,
  inputClass,
}: {
  stati: StatoLavorazioneConfig[];
  onChangeLabel: (id: string, label: string) => void;
  onChangeStatoColor: (id: string, hex: string) => void;
  onChangeStatoClosed?: (id: string, closed: boolean) => void;
  onRemove: (id: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  attiviStatoIds: Set<string>;
  storicoStatoIds: Set<string>;
  inputClass: string;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {stati.map((s, index) => {
        const inUse = attiviStatoIds.has(s.id) || storicoStatoIds.has(s.id);
        const canDelete = s.id !== STATO_LAVORAZIONE_COMPLETATA_ID && !inUse;
        const displayHex = statoDisplayColor(s.id, stati);
        return (
          <li
            key={s.id}
            draggable={!!onReorder}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex == null || dragIndex === index || !onReorder) return;
              onReorder(dragIndex, index);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={`flex min-h-[2.75rem] flex-wrap items-center gap-2 py-2.5 first:pt-0 last:pb-0 ${
              dragIndex === index ? "opacity-60" : ""
            }`}
          >
            {onReorder ? (
              <span
                className="cursor-grab select-none px-1 text-zinc-400 active:cursor-grabbing"
                title="Trascina per riordinare"
                aria-hidden
              >
                ⋮⋮
              </span>
            ) : null}
            <input
              className={`${inputClass} min-w-0 flex-1 basis-[10rem] text-sm`}
              value={s.label}
              onChange={(e) => onChangeLabel(s.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.blur();
                }
              }}
              aria-label="Nome stato"
            />
            <div className="flex shrink-0 items-center gap-2">
              <span
                className="inline-flex max-w-[9rem] shrink-0 items-center rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-black/10"
                style={readablePillStyleFromHex(displayHex)}
                title="Anteprima pill in tabella e Kanban"
                aria-hidden
              >
                <span className="truncate">{(s.label || s.id).trim() || "—"}</span>
              </span>
              <ColorSwatchButton
                value={displayHex}
                ariaLabel={`Colore stato ${s.label || s.id}`}
                onChange={(hex) => onChangeStatoColor(s.id, hex)}
              />
            </div>
            {onChangeStatoClosed ? (
              <label
                className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400"
                title="Solo workflow visuale (dropdown/filtri). L'archivio lavorazioni usa il campo archived in database."
              >
                <input
                  type="checkbox"
                  checked={s.closed === true}
                  onChange={(e) => onChangeStatoClosed(s.id, e.target.checked)}
                />
                Stato finale workflow
              </label>
            ) : null}
            <button
              type="button"
              disabled={!canDelete}
              className="ml-auto shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
              title={canDelete ? "Elimina stato" : "Stato in uso o obbligatorio"}
              onClick={() => onRemove(s.id)}
            >
              Elimina
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AddettoSettingsRow({
  record,
  addettoColors,
  onChangeAddettoColor,
  onUpdate,
  onRemove,
}: {
  record: AddettoRecord;
  addettoColors: Record<string, string>;
  onChangeAddettoColor: (nome: string, hex: string) => void;
  onUpdate: (id: string, patch: { nome?: string; cognome?: string | null }) => void;
  onRemove: (id: string) => void;
}) {
  const [nome, setNome] = useState(record.nome);
  const [cognome, setCognome] = useState(record.cognome ?? "");

  useEffect(() => {
    setNome(record.nome);
    setCognome(record.cognome ?? "");
  }, [record.nome, record.cognome, record.id]);

  /** In tabella lavorazioni la pill usa il nome (chiave colori), non nome+cognome. */
  const tableAddettoLabel = nome.trim() || "—";
  const colorKey = nome.trim() || record.nome;
  const displayHex = addettoDisplayColor(colorKey, addettoColors);

  return (
    <li className={ADDETTI_SETTINGS_ROW_CLASS}>
      <input
        className={ADDETTI_SETTINGS_INPUT_CLASS}
        value={nome}
        placeholder="Nome"
        required
        onChange={(e) => setNome(e.target.value)}
        onBlur={() => {
          const t = nome.trim();
          if (t && t !== record.nome) onUpdate(record.id, { nome: t });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        aria-label="Nome addetto"
      />
      <input
        className={ADDETTI_SETTINGS_INPUT_CLASS}
        value={cognome}
        placeholder="Cognome (opz.)"
        onChange={(e) => setCognome(e.target.value)}
        onBlur={() => {
          const t = cognome.trim();
          const prev = (record.cognome ?? "").trim();
          if (t !== prev) onUpdate(record.id, { cognome: t || null });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        aria-label="Cognome addetto"
      />
      <div className={ADDETTI_PREVIEW_COL_CLASS} title="Anteprima come in tabella lavorazioni">
        <div className={ADDETTI_PILL_SLOT_CLASS}>
          <LavorazioneAddettoReadOnlyPill
            addetto={tableAddettoLabel}
            addettoColors={addettoColors}
            fullWidth
          />
        </div>
        <ColorSwatchButton
          value={displayHex}
          ariaLabel={`Colore addetto ${tableAddettoLabel}`}
          onChange={(hex) => onChangeAddettoColor(record.nome, hex)}
        />
      </div>
      <button
        type="button"
        className={`${ADDETTI_DELETE_BTN} ${erpFocus} w-full sm:w-auto`}
        onClick={() => onRemove(record.id)}
      >
        Elimina
      </button>
    </li>
  );
}

export function AddettiSettingsList({
  addettiRecords,
  addettoColors,
  onChangeAddettoColor,
  onUpdateAddetto,
  onRemove,
  attiviAddetti: _attiviAddetti,
  storicoAddetti: _storicoAddetti,
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
    return (
      <p className="col-span-full px-3 py-6 text-center text-sm text-[color:var(--cab-text-muted)] sm:px-4">
        Nessun addetto. Aggiungi il primo con il modulo sopra.
      </p>
    );
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
        />
      ))}
    </ul>
  );
}
