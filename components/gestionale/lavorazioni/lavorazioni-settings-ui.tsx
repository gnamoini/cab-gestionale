"use client";

import { useMemo, useRef, useState } from "react";
import { SettingsColorPickerPopover } from "@/components/gestionale/settings-color-picker-popover";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import { addettoDisplayColor } from "@/lib/lavorazioni/addetto-colors-assign";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { STATO_LAVORAZIONE_COMPLETATA_ID } from "@/lib/lavorazioni/stati-dynamic";
import { sortStringsItCaseInsensitive } from "@/lib/ui/sort-strings-it";
import { addettoBadgeStyle } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { SettingsEditableStringRow } from "@/components/dashboard/settings-list-ui";

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
        className="h-8 w-8 rounded-md border-2 border-zinc-300 shadow-sm transition hover:ring-2 hover:ring-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)] dark:border-zinc-600"
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

export function AddettiSettingsList({
  addetti,
  addettoColors,
  onChangeAddettoColor,
  onRenameBlur,
  onRemove,
  attiviAddetti: _attiviAddetti,
  storicoAddetti: _storicoAddetti,
  inputClass: _inputClass,
}: {
  addetti: string[];
  addettoColors: Record<string, string>;
  onChangeAddettoColor: (nome: string, hex: string) => void;
  onRenameBlur: (previousName: string, nextName: string) => void;
  onRemove: (name: string) => void;
  attiviAddetti: Set<string>;
  storicoAddetti: Set<string>;
  inputClass: string;
}) {
  const sortedAddetti = useMemo(() => sortStringsItCaseInsensitive(addetti), [addetti]);

  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {sortedAddetti.map((a) => {
        const displayHex = addettoDisplayColor(a, addettoColors);
        return (
          <SettingsEditableStringRow
            key={a}
            value={a}
            onRenameBlur={onRenameBlur}
            onRemove={() => onRemove(a)}
            trailing={
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-black/10"
                  style={addettoBadgeStyle(displayHex)}
                  title="Anteprima pill in tabella"
                  aria-hidden
                >
                  {a}
                </span>
                <ColorSwatchButton
                  value={displayHex}
                  ariaLabel={`Colore addetto ${a}`}
                  onChange={(hex) => onChangeAddettoColor(a, hex)}
                />
              </div>
            }
          />
        );
      })}
    </ul>
  );
}
