"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { PageToolbarCtaLabel } from "@/components/design-system";
import { erpBtnNeutral, erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsBtnPrimary, dsInput, dsPageToolbarCtaCompact } from "@/lib/ui/design-system";

/** Shell pannelli elenco impostazioni (clienti, gerarchie, …). */
export const SETTINGS_PANEL_SHELL =
  "w-full overflow-hidden rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)]";

export const SETTINGS_LIST_UL = "divide-y divide-[color:var(--cab-border)]";

/** Lista con separatore superiore (elenchi in card sezione). */
export const SETTINGS_LIST_DIVIDER_UL = "mt-3 divide-y divide-[color:var(--cab-border)]";

/** Card sezione interna (magazzino, clienti, parametri economici). */
export const SETTINGS_SECTION_CARD = `${SETTINGS_PANEL_SHELL} p-3 sm:p-4`;

export const SETTINGS_SECTION_TITLE =
  "text-xs font-bold uppercase tracking-wide text-[color:var(--cab-text)]";

export const SETTINGS_SECTION_HINT = "mt-1 text-xs text-[color:var(--cab-text-muted)]";

/** Input numerico compatto (sconti % in elenchi). */
export const SETTINGS_DISCOUNT_INPUT =
  "w-16 min-h-10 rounded-[var(--ds-radius-md)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-1.5 py-0.5 text-xs tabular-nums text-[color:var(--cab-text)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_22%,transparent)]";

export const SETTINGS_LIST_ROW =
  "group flex min-h-[2.75rem] items-center justify-between gap-2 px-2 py-1.5 transition-colors duration-150 ease-out hover:bg-[var(--cab-hover)]";

export const SETTINGS_LIST_INPUT =
  "min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-xs font-medium text-[color:var(--cab-text)] outline-none transition-[border-color,background-color,box-shadow] duration-150 focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:bg-[var(--cab-surface)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_25%,transparent)]";

/** Pulsanti azione riga impostazioni (allineati a lavorazioni-settings-ui). */
export const SETTINGS_ROW_BTN_BASE =
  "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium min-h-[2.25rem] sm:min-h-9";

export const SETTINGS_ROW_BTN_NEUTRAL = `${SETTINGS_ROW_BTN_BASE} ${erpBtnNeutral} border-transparent`;

export const SETTINGS_ROW_BTN_PRIMARY = `${SETTINGS_ROW_BTN_BASE} ${dsBtnPrimary}`;

export const SETTINGS_ROW_BTN_DANGER =
  `${SETTINGS_ROW_BTN_BASE} border-transparent text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))] hover:bg-[color:color-mix(in_srgb,var(--cab-danger)_10%,var(--cab-surface))] ${erpFocus}`;

export function SettingsRowActionButtons({
  mode,
  itemLabel,
  onEdit,
  onConfirm,
  onCancelEdit,
  onRemove,
  showRemoveInEdit = false,
}: {
  mode: "view" | "edit";
  itemLabel: string;
  onEdit: () => void;
  onConfirm: () => void;
  onCancelEdit: () => void;
  onRemove: () => void;
  /** Righe sempre in edit (es. gerarchie): mostra Elimina accanto a Conferma/Annulla. */
  showRemoveInEdit?: boolean;
}) {
  if (mode === "edit") {
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <button
          type="button"
          className={SETTINGS_ROW_BTN_PRIMARY}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onConfirm}
        >
          Conferma
        </button>
        <button
          type="button"
          className={SETTINGS_ROW_BTN_NEUTRAL}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onCancelEdit}
        >
          Annulla
        </button>
        {showRemoveInEdit ? (
          <button
            type="button"
            className={SETTINGS_ROW_BTN_DANGER}
            onClick={onRemove}
            aria-label={`Elimina ${itemLabel}`}
          >
            Elimina
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
      <button
        type="button"
        className={SETTINGS_ROW_BTN_NEUTRAL}
        onClick={onEdit}
        aria-label={`Modifica ${itemLabel}`}
      >
        Modifica
      </button>
      <button type="button" className={SETTINGS_ROW_BTN_DANGER} onClick={onRemove} aria-label={`Elimina ${itemLabel}`}>
        Elimina
      </button>
    </div>
  );
}

/** Riga con campo sempre editabile (gerarchie, codici modello). */
export function SettingsInlineStringRow({
  value,
  onRenameBlur,
  onRemove,
  ariaLabel,
}: {
  value: string;
  onRenameBlur: (previous: string, next: string) => void;
  onRemove: () => void;
  ariaLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const next = inputRef.current?.value ?? value;
    onRenameBlur(value, next);
  };

  const cancel = () => {
    if (inputRef.current) inputRef.current.value = value;
  };

  return (
    <li className={`${SETTINGS_LIST_ROW} gap-2 py-2`}>
      <input
        ref={inputRef}
        className={`${dsInput} min-h-9 min-w-0 flex-1 py-1.5 text-sm`}
        defaultValue={value}
        key={`${value}-inline`}
        aria-label={ariaLabel ?? `Modifica ${value}`}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            commit();
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            cancel();
          }
        }}
      />
      <SettingsRowActionButtons
        mode="edit"
        itemLabel={value}
        showRemoveInEdit
        onEdit={() => {}}
        onConfirm={commit}
        onCancelEdit={cancel}
        onRemove={onRemove}
      />
    </li>
  );
}

/** Riga rapida: input + CTA (senza shell toolbar). */
export function SettingsQuickAddRow({
  placeholder,
  value,
  onChange,
  onAdd,
  addLabel,
  addLabelShort,
  inputAriaLabel,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  addLabel: string;
  addLabelShort: string;
  inputAriaLabel: string;
}) {
  const trimmed = value.trim();
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      <input
        className={`${dsInput} min-h-10 min-w-0 flex-1`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-label={inputAriaLabel}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (trimmed) onAdd();
          }
        }}
      />
      <button
        type="button"
        className={`${dsPageToolbarCtaCompact} min-h-10 w-full shrink-0 sm:w-auto`}
        disabled={!trimmed}
        onClick={onAdd}
      >
        <PageToolbarCtaLabel short={addLabelShort} full={addLabel} />
      </button>
    </div>
  );
}

export function SettingsEditableStringRow({
  value,
  onRenameBlur,
  onRemove,
  trailing,
}: {
  value: string;
  onRenameBlur: (previous: string, next: string) => void;
  onRemove: () => void;
  trailing?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commitEdit = () => {
    const next = inputRef.current?.value ?? value;
    setEditing(false);
    onRenameBlur(value, next);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  return (
    <li className={SETTINGS_LIST_ROW}>
      {editing ? (
        <input
          ref={inputRef}
          className={SETTINGS_LIST_INPUT}
          defaultValue={value}
          autoFocus
          aria-label={`Modifica ${value}`}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              commitEdit();
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              cancelEdit();
            }
          }}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate px-1.5 text-xs font-medium text-[color:var(--cab-text)]">{value}</span>
      )}
      {trailing}
      <SettingsRowActionButtons
        mode={editing ? "edit" : "view"}
        itemLabel={value}
        onEdit={() => setEditing(true)}
        onConfirm={commitEdit}
        onCancelEdit={cancelEdit}
        onRemove={onRemove}
      />
    </li>
  );
}
