"use client";

import { GestionaleConfirmDialog, gestionaleConfirmActionsClass } from "@/components/gestionale/gestionale-confirm-dialog";
import {
  GestionaleModalFooterCancelButton,
  GestionaleModalFooterSaveButton,
} from "@/components/design-system";
import { erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import type { SchedaIngressoUnknownSettingItem } from "@/lib/schede/scheda-ingresso-unknown-settings";

export function SchedaIngressoUnknownSettingsDialog({
  open,
  items,
  pending = false,
  canSaveSettings = true,
  onCancel,
  onSaveAndContinue,
  onContinueWithoutSave,
}: {
  open: boolean;
  items: readonly SchedaIngressoUnknownSettingItem[];
  pending?: boolean;
  canSaveSettings?: boolean;
  onCancel: () => void;
  onSaveAndContinue: () => void;
  onContinueWithoutSave: () => void;
}) {
  return (
    <GestionaleConfirmDialog
      open={open}
      title="Nuovi valori negli elenchi globali"
      subtitle="Alcuni campi della scheda non sono presenti nelle impostazioni globali."
      layerClassName="z-[125]"
      pending={pending}
      onCancel={onCancel}
      footer={
        <div className={gestionaleConfirmActionsClass}>
          <GestionaleModalFooterCancelButton
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={onCancel}
          />
          <button
            type="button"
            className={`${erpBtnNeutral} min-h-11 w-full sm:w-auto`}
            disabled={pending}
            onClick={onContinueWithoutSave}
          >
            Continua senza salvare
          </button>
          {canSaveSettings ? (
            <GestionaleModalFooterSaveButton
              type="button"
              className="w-full sm:w-auto"
              loading={pending}
              loadingLabel="Salvataggio…"
              onClick={onSaveAndContinue}
            >
              Salva impostazioni e continua
            </GestionaleModalFooterSaveButton>
          ) : null}
        </div>
      }
    >
      <div className="space-y-3 text-sm text-[color:var(--cab-text-muted)]">
        <p>
          {items.length === 1
            ? "Il seguente valore verrà aggiunto agli elenchi globali se confermi:"
            : "I seguenti valori verranno aggiunti agli elenchi globali se confermi:"}
        </p>
        <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
          {items.map((item) => (
            <li key={`${item.fieldKey}-${item.value}`} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium uppercase tracking-wide text-[color:var(--cab-muted-fg)]">
                {item.label}
              </span>
              <span className="font-medium text-[color:var(--cab-fg)]">{item.value}</span>
            </li>
          ))}
        </ul>
        {!canSaveSettings ? (
          <p className="text-xs">
            Non hai permesso di modificare la configurazione globale. Puoi comunque salvare la scheda.
          </p>
        ) : (
          <p className="text-xs">Puoi anche salvare la scheda senza aggiornare gli elenchi globali.</p>
        )}
      </div>
    </GestionaleConfirmDialog>
  );
}
