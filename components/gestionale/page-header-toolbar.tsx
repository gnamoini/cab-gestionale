"use client";

import type { ReactNode } from "react";
import { dsPageToolbarBtn } from "@/lib/ui/design-system";
import { IconGestionaleLog, IconGestionaleUndo } from "@/components/gestionale/gestionale-log-ui";

/** Toolbar azioni header: wrap interno se molti pulsanti; il blocco va sotto il titolo quando manca spazio (PageHeader). */
export const gestionalePageToolbarActionsClass =
  "flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2";

export function GestionalePageToolbarActions({
  className,
  leading,
  canUndo,
  undoDisabled = false,
  undoPending = false,
  onUndo,
  onOpenLog,
  logTitle = "Storico modifiche",
}: {
  className?: string;
  leading?: ReactNode;
  canUndo: boolean;
  undoDisabled?: boolean;
  undoPending?: boolean;
  onUndo?: () => void;
  onOpenLog: () => void;
  logTitle?: string;
}) {
  const undoInactive = undoDisabled || !canUndo || undoPending;

  return (
    <div className={`${gestionalePageToolbarActionsClass}${className ? ` ${className}` : ""}`}>
      {leading}
      <button
        type="button"
        onClick={onUndo}
        className={`${dsPageToolbarBtn} shrink-0 px-2.5 sm:px-3`}
        title={canUndo && !undoDisabled && !undoPending ? "Annulla ultima azione" : "Nessuna azione da annullare"}
        disabled={undoInactive}
        aria-disabled={undoInactive}
      >
        <IconGestionaleUndo />
        <span className="sr-only">Annulla ultima azione</span>
      </button>
      <button
        type="button"
        onClick={onOpenLog}
        className={`${dsPageToolbarBtn} shrink-0 px-2.5 sm:px-3`}
        title={logTitle}
      >
        <IconGestionaleLog />
        <span className="sr-only">Log modifiche</span>
      </button>
    </div>
  );
}
