"use client";

import { Tooltip } from "@/components/ui";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LoadingSpinner } from "@/components/design-system/loading";
import { PageToolbarCtaLabel } from "@/components/design-system/page-toolbar";
import { ToolbarGroupOverflowToggle } from "@/components/design-system/toolbar-group";
import { MobileFilterDrawer } from "@/components/gestionale/mobile-filter-drawer";
import { IconGestionaleLog, IconGestionaleUndo } from "@/components/gestionale/gestionale-log-ui";
import { ShellNavIconRefresh } from "@/components/design-system";
import {
  dsPageToolbarBtn,
  dsPageHeaderIconGlyphDense,
  dsPageHeaderToolbarActionBtn,
  dsPageToolbarIconBtn,
  dsPageToolbarPrimaryBtn,
} from "@/lib/ui/design-system";
import { TOOLTIP_GAP_SHELL_NAV } from "@/lib/ui/tooltip-portal";
import { useSmUp } from "@/lib/ui/use-sm-up";

/** Shell toolbar header (PageHeader): unico `flex-safe-row` per evitare doppia signature linter. */
export const gestionalePageToolbarActionsClass =
  "flex-safe-row min-w-0 max-w-full shrink flex-wrap items-center justify-end gap-2 cab-shell-mobile:flex-wrap cab-shell-tablet:flex-wrap sm:flex-wrap";

/** Contenuto azioni dentro la shell — senza `flex-safe-row` (il wrapper è in PageHeader). */
export const gestionalePageToolbarActionsInnerClass =
  "flex min-w-0 max-w-full shrink-0 flex-wrap items-center justify-end gap-2 cab-shell-mobile:flex-wrap cab-shell-tablet:flex-wrap sm:flex-wrap";

export function GestionaleRefreshToolbarButton({
  busy = false,
  onClick,
  label = "Aggiorna",
}: {
  busy?: boolean;
  onClick: () => void;
  label?: string;
}) {
  const tip = busy ? "Aggiornamento…" : label;
  const busyLabel = "Aggiornamento…";
  return (
    <Tooltip content={tip} showOnFocus={false} sideOffset={TOOLTIP_GAP_SHELL_NAV}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-busy={busy}
        aria-label={label}
        className={`${dsPageHeaderToolbarActionBtn} ${busy ? "!cursor-wait" : ""}`}
      >
        <ShellNavIconRefresh
          className={`${dsPageHeaderIconGlyphDense} sm:h-4 sm:w-4 max-sm:opacity-100 sm:opacity-90 motion-reduce:animate-none${busy ? " animate-spin" : ""}`}
        />
        <span className={`hidden sm:inline transition-opacity duration-200`}>
          {busy ? busyLabel : label}
        </span>
        <span className="sr-only sm:hidden">{busy ? busyLabel : label}</span>
      </button>
    </Tooltip>
  );
}

export function GestionaleDirtySaveActions({
  isDirty,
  saving = false,
  onCancel,
  onSave,
  statusLabel = "Modifiche non salvate",
  cancelTitle = "Ripristina le modifiche non salvate",
  saveTitle = "Salva tutte le modifiche",
}: {
  isDirty: boolean;
  saving?: boolean;
  onCancel: () => void;
  onSave: () => void;
  statusLabel?: string;
  cancelTitle?: string;
  saveTitle?: string;
}) {
  const disabled = !isDirty || saving;

  return (
    <div
      className="flex min-w-0 shrink-0 flex-nowrap items-center gap-2 max-sm:w-full max-sm:flex-col max-sm:items-stretch"
      role="group"
      aria-label="Azioni salvataggio"
    >
      {isDirty ? (
        <span
          role="status"
          data-testid="gestionale-dirty-status-chip"
          className="inline-flex h-10 min-h-[2.5rem] shrink-0 items-center gap-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-warning)_48%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_10%,var(--cab-card))] px-3 text-xs font-medium leading-none text-[color:color-mix(in_srgb,var(--cab-warning)_92%,var(--cab-text))] shadow-[var(--cab-shadow-sm)] max-sm:w-full max-sm:justify-center"
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--cab-warning)] ring-2 ring-[color:color-mix(in_srgb,var(--cab-warning)_32%,transparent)]"
            aria-hidden
          />
          {statusLabel}
        </span>
      ) : null}
      <Tooltip content={cancelTitle}><button type="button" className={`${dsPageToolbarBtn} max-sm:w-full`} onClick={onCancel} disabled={disabled}>
        <PageToolbarCtaLabel short="Annulla" full="Annulla modifiche"/>
      </button></Tooltip>
      <Tooltip content={saveTitle}><button type="button" className={`${dsPageToolbarPrimaryBtn} max-sm:w-full`} onClick={onSave} disabled={disabled} aria-busy={saving}>
        {saving ? (<span className="inline-flex items-center gap-2">
            <LoadingSpinner size="sm" label="Salvataggio in corso"/>
            <span>Salvataggio…</span>
          </span>) : (<PageToolbarCtaLabel short="Salva" full={isDirty ? "Salva modifiche" : "Salva"}/>)}
      </button></Tooltip>
    </div>
  );
}

/** @deprecated Sostituito da PageActionMenu — mantenuto per GestionaleDirtySaveActions e refresh interni. */
export function GestionalePageToolbarActions({
  className,
  leading,
  showUndo = true,
  canUndo,
  undoDisabled = false,
  undoPending = false,
  onUndo,
  onOpenLog,
  logTitle = "Storico modifiche",
  /** Su mobile sposta il log nel drawer «Altro» (es. Magazzino). */
  logInOverflowOnMobile = false,
  overflowActions,
  overflowOpen: overflowOpenProp,
  onOverflowToggle,
}: {
  className?: string;
  leading?: ReactNode;
  /** false = nasconde il pulsante undo (es. Lavorazioni). */
  showUndo?: boolean;
  canUndo: boolean;
  undoDisabled?: boolean;
  undoPending?: boolean;
  onUndo?: () => void;
  onOpenLog: () => void;
  logTitle?: string;
  logInOverflowOnMobile?: boolean;
  /** Utility modulo (Stampa, Kanban, …) — drawer «Altro» su mobile, inline da sm+. */
  overflowActions?: ReactNode;
  overflowOpen?: boolean;
  onOverflowToggle?: () => void;
}) {
  const smUp = useSmUp();
  const [overflowOpenInternal, setOverflowOpenInternal] = useState(false);
  const overflowOpen = overflowOpenProp ?? overflowOpenInternal;
  const toggleOverflow = onOverflowToggle ?? (() => setOverflowOpenInternal((o) => !o));
  const closeOverflow = useCallback(() => {
    if (overflowOpenProp !== undefined) onOverflowToggle?.();
    else setOverflowOpenInternal(false);
  }, [overflowOpenProp, onOverflowToggle]);

  const undoInactive = undoDisabled || !canUndo || undoPending;
  void logTitle;

  const hasOverflowMenu = Boolean(overflowActions) || logInOverflowOnMobile;

  useEffect(() => {
    if (smUp && overflowOpen) closeOverflow();
  }, [smUp, overflowOpen, closeOverflow]);

  const showOverflowDrawer = !smUp && overflowOpen && hasOverflowMenu;

  const renderLogButton = (extraClass = "") => (
    <Tooltip content="Log">
      <button
        type="button"
        onClick={onOpenLog}
        className={`${dsPageToolbarIconBtn} shrink-0 ${extraClass}`.trim()}
        aria-label="Log modifiche"
      >
        <IconGestionaleLog />
        <span className="sr-only">Log modifiche</span>
      </button>
    </Tooltip>
  );

  const renderLogOverflowAction = () => (
    <button
      type="button"
      onClick={onOpenLog}
      className={`${dsPageToolbarBtn} w-full justify-start`}
      aria-label="Log modifiche"
    >
      <IconGestionaleLog />
      <span>Log modifiche</span>
    </button>
  );

  return (
    <>
      <div className={`${gestionalePageToolbarActionsInnerClass}${className ? ` ${className}` : ""}`}>
        {leading}
        {showUndo ? (
          <Tooltip content={canUndo && !undoDisabled && !undoPending ? "Annulla" : "Non disponibile"}>
            <button
              type="button"
              onClick={onUndo}
              className={`${dsPageToolbarIconBtn} shrink-0`}
              disabled={undoInactive}
              aria-disabled={undoInactive}
              aria-label="Annulla ultima azione"
            >
              <IconGestionaleUndo />
              <span className="sr-only">Annulla ultima azione</span>
            </button>
          </Tooltip>
        ) : null}
        {logInOverflowOnMobile ? <div className="hidden sm:contents">{renderLogButton()}</div> : renderLogButton()}
        {hasOverflowMenu ? (
          <>
            <div className="hidden min-w-0 shrink-0 flex-nowrap items-center justify-end gap-2 sm:flex sm:flex-wrap">
              {overflowActions}
            </div>
            <ToolbarGroupOverflowToggle expanded={overflowOpen} onToggle={toggleOverflow} />
          </>
        ) : null}
      </div>

      {showOverflowDrawer ? (
        <MobileFilterDrawer
          open
          onClose={closeOverflow}
          title="Altro"
          applyLabel="Chiudi"
          onApply={closeOverflow}
          closeOnBodyButtonClick
        >
          <div className="flex flex-col gap-2 [&_button]:w-full">
            {logInOverflowOnMobile ? renderLogOverflowAction() : null}
            {overflowActions}
          </div>
        </MobileFilterDrawer>
      ) : null}
    </>
  );
}
