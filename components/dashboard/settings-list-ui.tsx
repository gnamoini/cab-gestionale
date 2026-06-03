"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { PageToolbarCtaLabel } from "@/components/design-system";
import { erpBtnNeutral, erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { handleSettingsInlineEditKeyDown } from "@/lib/settings/settings-inline-edit-keyboard";
import { dsInput, dsPageToolbarCtaCompact } from "@/lib/ui/design-system";

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

export const SETTINGS_LIST_ACTION =
  "shrink-0 rounded-md px-2 py-1 text-xs font-medium opacity-70 transition-opacity duration-150 group-hover:opacity-100";

function IconPencil({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.862 4.487" />
    </svg>
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
  return (
    <li className={`${SETTINGS_LIST_ROW} gap-2 py-2`}>
      <input
        className={`${dsInput} min-h-9 min-w-0 flex-1 py-1.5 text-sm`}
        defaultValue={value}
        key={`${value}-inline`}
        aria-label={ariaLabel ?? `Modifica ${value}`}
        onBlur={(e) => onRenameBlur(value, e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
          handleSettingsInlineEditKeyDown(e, value)
        }
      />
      <button
        type="button"
        className={`${erpBtnNeutral} min-h-9 shrink-0 border-transparent px-2.5 text-xs text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))] hover:bg-[color:color-mix(in_srgb,var(--cab-danger)_10%,var(--cab-surface))] ${erpFocus}`}
        onClick={onRemove}
      >
        Elimina
      </button>
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
  const initialValueRef = useRef(value);

  return (
    <li className={SETTINGS_LIST_ROW}>
      {editing ? (
        <input
          className={SETTINGS_LIST_INPUT}
          defaultValue={value}
          autoFocus
          aria-label={`Modifica ${value}`}
          onBlur={(e) => {
            setEditing(false);
            onRenameBlur(value, e.target.value);
          }}
          onKeyDown={(e) =>
            handleSettingsInlineEditKeyDown(e, initialValueRef.current, () => setEditing(false))
          }
        />
      ) : (
        <span className="min-w-0 flex-1 truncate px-1.5 text-xs font-medium text-[color:var(--cab-text)]">{value}</span>
      )}
      {trailing}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          className={`${SETTINGS_LIST_ACTION} text-[color:var(--cab-text-muted)] hover:text-[color:var(--cab-primary)] ${erpFocus}`}
          title="Modifica"
          aria-label={`Modifica ${value}`}
          onClick={() => {
            initialValueRef.current = value;
            setEditing(true);
          }}
        >
          <IconPencil />
        </button>
        <button
          type="button"
          className={`${SETTINGS_LIST_ACTION} text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))] hover:underline ${erpFocus}`}
          onClick={onRemove}
        >
          Elimina
        </button>
      </div>
    </li>
  );
}
