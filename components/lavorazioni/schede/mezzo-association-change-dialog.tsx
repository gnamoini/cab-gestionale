"use client";

import {
  GestionaleConfirmDialog,
  gestionaleConfirmActionsClass,
} from "@/components/gestionale/gestionale-confirm-dialog";
import {
  associationFieldLabel,
  type AssociationChange,
} from "@/lib/domain/mezzo/mezzo-association";
import {
  GestionaleModalFooterCancelButton,
  GestionaleModalFooterSaveButton,
} from "@/components/design-system";

export function MezzoAssociationChangeDialog({
  open,
  change,
  showReasonField = false,
  reason = "",
  onReasonChange,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  change: AssociationChange | null;
  showReasonField?: boolean;
  reason?: string;
  onReasonChange?: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!change) return null;

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Aggiornare l'associazione del mezzo?"
      layerClassName="z-[calc(var(--ds-z-modal,80)+1)]"
      onCancel={onCancel}
      footer={
        <div className={gestionaleConfirmActionsClass}>
          <GestionaleModalFooterCancelButton className="w-full sm:w-auto" onClick={onCancel} />
          <GestionaleModalFooterSaveButton
            type="button"
            className="w-full sm:w-auto"
            onClick={onConfirm}
          >
            Conferma aggiornamento
          </GestionaleModalFooterSaveButton>
        </div>
      }
    >
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        Il mezzo risulta attualmente associato a:
      </p>
      <div className="mt-3 space-y-3">
        {change.changedFields.map((key) => (
          <div
            key={key}
            className="rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface-muted)] px-3 py-2"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {associationFieldLabel(key)}
            </p>
            <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">{change.oldValues[key]}</p>
            <p className="mt-1 text-center text-xs text-zinc-400" aria-hidden>
              ↓
            </p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{change.newValues[key]}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Stai per aggiornare l&apos;associazione. Le lavorazioni già esistenti manterranno i dati storici.
        Le nuove lavorazioni utilizzeranno la nuova associazione.
      </p>
      {showReasonField ? (
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
            Motivazione (opzionale)
          </span>
          <textarea
            className="cab-input w-full min-h-[4rem] resize-y"
            value={reason}
            onChange={(e) => onReasonChange?.(e.target.value)}
            placeholder="Es. cambio commessa, nuovo utilizzatore…"
          />
        </label>
      ) : null}
    </GestionaleConfirmDialog>
  );
}
