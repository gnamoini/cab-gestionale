"use client";

import { GestionaleConfirmDialog, gestionaleConfirmActionsClass } from "@/components/gestionale/gestionale-confirm-dialog";
import { dsBtnDanger, dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";

export type GestionaleUnsavedPlacement = "nested" | "stacked";

/**
 * Pattern unico «modifiche non salvate» (Resta / Esci senza salvare / Salva ed esci).
 * - `nested`: overlay assoluto dentro una modale padre (editor preventivi/schede).
 * - `stacked`: modale gestionale sopra il resto (`LavorazioniModalShell` z-[120]).
 */
export function GestionaleUnsavedChangesDialog({
  open,
  placement = "nested",
  title = "Modifiche non salvate",
  message = "Hai modifiche non salvate. Come vuoi procedere?",
  stayLabel = "Resta",
  discardLabel = "Esci senza salvare",
  saveAndExitLabel = "Salva ed esci",
  pending = false,
  onStay,
  onDiscard,
  onSaveAndExit,
}: {
  open: boolean;
  placement?: GestionaleUnsavedPlacement;
  title?: string;
  message?: string;
  stayLabel?: string;
  discardLabel?: string;
  saveAndExitLabel?: string;
  pending?: boolean;
  onStay: () => void;
  onDiscard: () => void;
  onSaveAndExit: () => void;
}) {
  const actions = (
    <div className={gestionaleConfirmActionsClass}>
      <button type="button" className={`${dsBtnNeutral} min-h-[2.75rem] sm:min-h-0`} onClick={onStay} disabled={pending}>
        {stayLabel}
      </button>
      <button type="button" className={`${dsBtnDanger} min-h-[2.75rem] sm:min-h-0`} onClick={onDiscard} disabled={pending}>
        {discardLabel}
      </button>
      <button type="button" className={`${dsBtnPrimary} min-h-[2.75rem] sm:min-h-0`} onClick={onSaveAndExit} disabled={pending}>
        {pending ? "Salvataggio…" : saveAndExitLabel}
      </button>
    </div>
  );

  if (placement === "stacked") {
    return (
      <GestionaleConfirmDialog
        open={open}
        title={title}
        message={message}
        layerClassName="z-[120]"
        footer={actions}
        onCancel={onStay}
      />
    );
  }

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-[120] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gestionale-unsaved-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onStay();
      }}
    >
      <div
        className="w-full max-w-md rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-5 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 id="gestionale-unsaved-title" className="text-sm font-semibold text-[color:var(--cab-text)]">
          {title}
        </h3>
        <p className="mt-2 text-sm text-[color:var(--cab-text-muted)]">{message}</p>
        {actions}
      </div>
    </div>
  );
}
