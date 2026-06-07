"use client";

/**
 * SSOT UI Impostazioni — regole:
 * 1. Settings Page = layoutPageRoot + PageHeader + SETTINGS_PAGE_SHELL (master-detail).
 * 2. Settings Section = SETTINGS_SECTION_CARD + SettingsSectionHeader + content.
 * 3. Settings List Row = SETTINGS_LIST_ROW + SETTINGS_ROW_BTN_* (view/edit o inline).
 * 4. Settings Add = SettingsAddRow + dsPageToolbarCtaCompact.
 * 5. Settings Warning = SETTINGS_WARNING_BANNER (token semantici, no colori raw).
 * 6. Settings Action (admin one-shot) = SETTINGS_ACTION_CARD separata da config operativa.
 */

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { PageToolbarCtaLabel } from "@/components/design-system";
import { erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  dsBtnPrimary,
  dsFocus,
  dsInput,
  dsPageToolbarCtaCompact,
  dsSectionTitle,
  dsTypoSmall,
} from "@/lib/ui/design-system";

/** Shell pannelli elenco impostazioni (clienti, gerarchie, …). */
export const SETTINGS_PANEL_SHELL =
  "w-full overflow-hidden rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)]";

/** Wrapper pagina master-detail (sidebar + main). */
export const SETTINGS_PAGE_SHELL =
  "relative flex min-h-0 w-full min-w-0 flex-col overflow-visible rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[color:var(--cab-surface)] shadow-[var(--cab-shadow-sm)]";

export const SETTINGS_PAGE_GRID = "grid gap-4 p-3 md:grid-cols-[15rem_minmax(0,1fr)] md:p-4";

/** Aside navigazione sezioni (desktop sticky). */
export const SETTINGS_SIDEBAR_SHELL =
  "hidden w-[13.75rem] shrink-0 flex-col border-[color:var(--cab-border)] bg-[color:var(--cab-card)] md:sticky md:top-4 md:flex md:h-fit md:max-h-[calc(100dvh-8rem)] md:w-[15rem] md:overflow-hidden md:rounded-[var(--ds-radius-xl)] md:border md:shadow-[var(--cab-shadow-sm)]";

export const SETTINGS_MAIN_PANEL = "min-w-0 max-w-full overflow-x-hidden bg-transparent";

export const SETTINGS_MAIN_HEADER = "mb-4 min-w-0 border-b border-[color:var(--cab-border)] pb-3";

export const SETTINGS_NAV_GROUP_LABEL = `${dsTypoSmall} px-2 pt-2 pb-0.5 font-bold uppercase tracking-wider text-[color:var(--cab-text-muted)] first:pt-0`;

export const SETTINGS_NAV_BTN =
  "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition-colors duration-150 ease-out";

export const SETTINGS_LIST_UL = "divide-y divide-[color:var(--cab-border)]";

/** Lista con separatore superiore (elenchi in card sezione). */
export const SETTINGS_LIST_DIVIDER_UL = "mt-3 divide-y divide-[color:var(--cab-border)]";

/** Card sezione interna (magazzino, clienti, parametri economici). */
export const SETTINGS_SECTION_CARD = `${SETTINGS_PANEL_SHELL} p-3 sm:p-4`;

/** Card azioni amministrative secondarie (migrazioni one-shot). */
export const SETTINGS_ACTION_CARD = `${SETTINGS_PANEL_SHELL} mt-4 border-dashed bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-3 sm:p-4`;

export const SETTINGS_SECTION_TITLE =
  "text-xs font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]";

export const SETTINGS_SECTION_HINT = "mt-1 text-xs text-[color:var(--cab-text-muted)]";

export const SETTINGS_SECTION_DESC = SETTINGS_SECTION_HINT;

export const SETTINGS_ADD_ROW = "mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center";

export const SETTINGS_ADD_INPUT = `${dsInput} min-h-11 min-w-0 flex-1 text-sm ${dsFocus}`;

export const SETTINGS_EMPTY_STATE =
  "rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] px-4 py-8 text-center text-xs text-[color:var(--cab-text-muted)]";

export const SETTINGS_WARNING_BANNER =
  "mt-3 rounded-lg border border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_12%,var(--cab-surface))] px-3 py-2 text-xs text-[color:color-mix(in_srgb,var(--cab-warning)_75%,var(--cab-text))]";

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

export const SETTINGS_ROW_BTN_DANGER = `${SETTINGS_ROW_BTN_BASE} border-transparent text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))] hover:bg-[color:color-mix(in_srgb,var(--cab-danger)_10%,var(--cab-surface))] ${dsFocus}`;

export function settingsNavBtnClass(active: boolean): string {
  return active
    ? `${SETTINGS_NAV_BTN} bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] font-semibold text-[color:var(--cab-text)]`
    : `${SETTINGS_NAV_BTN} text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)]`;
}

export function SettingsSectionHeader({
  groupLabel,
  title,
  titleId,
  description,
  badge,
  level = "page",
}: {
  groupLabel?: string;
  title: string;
  titleId?: string;
  description?: string;
  badge?: ReactNode;
  /** page = h2 nel main panel; card = h3 in card interna */
  level?: "page" | "card";
}) {
  if (level === "card") {
    return (
      <header>
        <h3 className={SETTINGS_SECTION_TITLE}>{title}</h3>
        {description ? <p className={SETTINGS_SECTION_HINT}>{description}</p> : null}
      </header>
    );
  }

  return (
    <header className={SETTINGS_MAIN_HEADER}>
      {groupLabel ? <p className={SETTINGS_NAV_GROUP_LABEL}>{groupLabel}</p> : null}
      <h2 id={titleId} className={`${dsSectionTitle} mt-0.5`}>
        {title}
      </h2>
      {description ? <p className={`${SETTINGS_SECTION_HINT} mt-1 max-w-2xl`}>{description}</p> : null}
      {badge ? <div className="mt-2">{badge}</div> : null}
    </header>
  );
}

export function SettingsEmptyState({ children }: { children: ReactNode }) {
  return <p className={SETTINGS_EMPTY_STATE}>{children}</p>;
}

export function SettingsAddRow({
  value,
  onChange,
  onAdd,
  placeholder,
  inputAriaLabel,
  addLabel = "Aggiungi",
  addLabelShort = "Aggiungi",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
  inputAriaLabel: string;
  addLabel?: string;
  addLabelShort?: string;
  disabled?: boolean;
}) {
  const trimmed = value.trim();
  const canAdd = !disabled && Boolean(trimmed);

  return (
    <div className={SETTINGS_ADD_ROW}>
      <input
        className={SETTINGS_ADD_INPUT}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-label={inputAriaLabel}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (canAdd) onAdd();
          }
        }}
      />
      <button
        type="button"
        className={`${dsPageToolbarCtaCompact} min-h-11 w-full shrink-0 sm:w-auto`}
        disabled={!canAdd}
        onClick={onAdd}
      >
        <PageToolbarCtaLabel short={addLabelShort} full={addLabel} />
      </button>
    </div>
  );
}

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
  showRemoveInEdit?: boolean;
}) {
  if (mode === "edit") {
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <button type="button" className={SETTINGS_ROW_BTN_PRIMARY} onMouseDown={(e) => e.preventDefault()} onClick={onConfirm}>
          Conferma
        </button>
        <button type="button" className={SETTINGS_ROW_BTN_NEUTRAL} onMouseDown={(e) => e.preventDefault()} onClick={onCancelEdit}>
          Annulla
        </button>
        {showRemoveInEdit ? (
          <button type="button" className={SETTINGS_ROW_BTN_DANGER} onClick={onRemove} aria-label={`Elimina ${itemLabel}`}>
            Elimina
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
      <button type="button" className={SETTINGS_ROW_BTN_NEUTRAL} onClick={onEdit} aria-label={`Modifica ${itemLabel}`}>
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
  return (
    <SettingsAddRow
      value={value}
      onChange={onChange}
      onAdd={onAdd}
      placeholder={placeholder}
      inputAriaLabel={inputAriaLabel}
      addLabel={addLabel}
      addLabelShort={addLabelShort}
    />
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
  trailing?: ReactNode;
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

/** Box riga modello gerarchia — allineato a SETTINGS_LIST_ROW. */
export const SETTINGS_HIERARCHY_MODEL_BOX = `${SETTINGS_LIST_ROW} min-h-10 rounded-[var(--ds-radius-md)] border border-[color:var(--cab-border)] bg-[color:var(--cab-card)] px-2 hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-card))]`;

export const SETTINGS_HIERARCHY_MODEL_INPUT =
  "min-h-9 min-w-0 flex-1 border-0 bg-transparent px-1 py-0 text-sm font-medium text-[color:var(--cab-text)] outline-none placeholder:font-normal placeholder:text-[color:var(--cab-text-muted)] focus:bg-[color:color-mix(in_srgb,var(--cab-surface)_85%,var(--cab-card))] focus:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))]";
