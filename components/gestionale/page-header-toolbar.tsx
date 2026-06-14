"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LoadingSpinner } from "@/components/design-system/loading";
import { PageToolbarCtaLabel } from "@/components/design-system/page-toolbar";
import { ToolbarGroupOverflowToggle } from "@/components/design-system/toolbar-group";
import { Tooltip } from "@/components/design-system/tooltip";
import { MobileFilterDrawer } from "@/components/gestionale/mobile-filter-drawer";
import { IconGestionaleLog, IconGestionaleUndo, IconGestionaleRefresh } from "@/components/gestionale/gestionale-log-ui";
import {
  dsPageToolbarBtn,
  dsPageToolbarIconBtn,
  dsPageToolbarPrimaryBtn,
} from "@/lib/ui/design-system";
import { useSmUp } from "@/lib/ui/use-sm-up";

/** Shell toolbar header (PageHeader): unico `flex-safe-row` per evitare doppia signature linter. */
export const gestionalePageToolbarActionsClass =
  "flex-safe-row min-w-0 max-w-full shrink-0 flex-nowrap items-center justify-end gap-2 sm:flex-wrap";

/** Contenuto azioni dentro la shell — senza `flex-safe-row` (il wrapper è in PageHeader). */
export const gestionalePageToolbarActionsInnerClass =
  "flex min-w-0 max-w-full shrink-0 flex-nowrap items-center justify-end gap-2 sm:flex-wrap";

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
    <Tooltip content={tip} showOnFocus={false}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-busy={busy}
        aria-label={label}
        className={`${dsPageToolbarIconBtn} sm:h-auto sm:min-h-[2.5rem] sm:w-auto sm:gap-2 sm:px-3 sm:py-2 ${
          busy
            ? "!cursor-wait !opacity-100 border-[color:color-mix(in_srgb,var(--cab-primary)_38%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] shadow-[var(--cab-shadow-sm)] ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_32%,transparent)]"
            : ""
        }`}
      >
        <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
          <span
            className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
              busy ? "scale-75 opacity-0" : "scale-100 opacity-100"
            }`}
          >
            <IconGestionaleRefresh />
          </span>
          <span
            className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
              busy ? "scale-100 opacity-100" : "scale-75 opacity-0"
            }`}
          >
            <LoadingSpinner size="sm" label={busyLabel} />
          </span>
        </span>
        <span
          className={`hidden sm:inline transition-opacity duration-200 ${busy ? "text-[color:color-mix(in_srgb,var(--cab-primary)_88%,var(--cab-text))]" : ""}`}
        >
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
      <button
        type="button"
        className={`${dsPageToolbarBtn} max-sm:w-full`}
        onClick={onCancel}
        disabled={disabled}
        title={cancelTitle}
      >
        <PageToolbarCtaLabel short="Annulla" full="Annulla modifiche" />
      </button>
      <button
        type="button"
        className={`${dsPageToolbarPrimaryBtn} max-sm:w-full`}
        onClick={onSave}
        disabled={disabled}
        title={saveTitle}
        aria-busy={saving}
      >
        {saving ? (
          <span className="inline-flex items-center gap-2">
            <LoadingSpinner size="sm" label="Salvataggio in corso" />
            <span>Salvataggio…</span>
          </span>
        ) : (
          <PageToolbarCtaLabel short="Salva" full={isDirty ? "Salva modifiche" : "Salva"} />
        )}
      </button>
    </div>
  );
}

export function GestionalePageToolbarActions({
  className,
  leading,
  canUndo,
  undoDisabled = false,
  undoPending = false,
  onUndo,
  onOpenLog,
  logTitle = "Storico modifiche",
  overflowActions,
  overflowOpen: overflowOpenProp,
  onOverflowToggle,
}: {
  className?: string;
  leading?: ReactNode;
  canUndo: boolean;
  undoDisabled?: boolean;
  undoPending?: boolean;
  onUndo?: () => void;
  onOpenLog: () => void;
  logTitle?: string;
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

  useEffect(() => {
    if (smUp && overflowOpen) closeOverflow();
  }, [smUp, overflowOpen, closeOverflow]);

  const showOverflowDrawer = !smUp && overflowOpen && Boolean(overflowActions);

  return (
    <>
      <div className={`${gestionalePageToolbarActionsInnerClass}${className ? ` ${className}` : ""}`}>
        {leading}
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
        <Tooltip content="Log">
          <button
            type="button"
            onClick={onOpenLog}
            className={`${dsPageToolbarIconBtn} shrink-0`}
            aria-label="Log modifiche"
          >
            <IconGestionaleLog />
            <span className="sr-only">Log modifiche</span>
          </button>
        </Tooltip>
        {overflowActions ? (
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
          <div className="flex flex-col gap-2 [&_button]:w-full [&_button]:justify-center">{overflowActions}</div>
        </MobileFilterDrawer>
      ) : null}
    </>
  );
}
