"use client";

import { useState } from "react";
import { GestionaleConfirmDialog, gestionaleConfirmActionsClass } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleModalFooterCancelButton } from "@/components/design-system";
import { dsBtnPrimary, dsBtnSecondary } from "@/lib/ui/design-system";
import { cabModalZConfirm } from "@/lib/ui/mobile-modal-behavior";
import {
  detectPopupInstructionProfile,
  getPopupUnblockInstructions,
} from "@/lib/browser/popup-instructions";
import type { PopupBlockedDialogRequest } from "@/lib/browser/popup-guard";

export function PopupBlockedDialog({
  open,
  request,
  retryPending,
  onCancel,
  onRetry,
}: {
  open: boolean;
  request: PopupBlockedDialogRequest | null;
  retryPending: boolean;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const [showInstructions, setShowInstructions] = useState(false);

  if (!request) return null;

  const profile = detectPopupInstructionProfile();
  const instructions = getPopupUnblockInstructions(profile, request.domain);

  const footer = (
    <div className={gestionaleConfirmActionsClass}>
      <GestionaleModalFooterCancelButton
        className="w-full sm:w-auto"
        onClick={onCancel}
        disabled={retryPending}
      >
        Annulla
      </GestionaleModalFooterCancelButton>
      <button
        type="button"
        className={`${dsBtnSecondary} min-h-[2.75rem] w-full sm:min-h-0 sm:w-auto`}
        onClick={() => setShowInstructions((v) => !v)}
        disabled={retryPending}
      >
        {showInstructions ? "Nascondi istruzioni" : "Come abilitarli"}
      </button>
      <button
        type="button"
        className={`${dsBtnPrimary} min-h-[2.75rem] w-full sm:min-h-0 sm:w-auto`}
        onClick={onRetry}
        disabled={retryPending}
      >
        {retryPending ? "Apertura…" : "Riprova"}
      </button>
    </div>
  );

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Il browser ha bloccato l'apertura"
      layerClassName={cabModalZConfirm}
      footer={footer}
      onCancel={onCancel}
    >
      <div className="space-y-3 text-sm text-[color:var(--cab-text-muted)]">
        <p>
          Il browser ha impedito l&apos;apertura del {request.documentLabel}. È una protezione
          normale: non è un errore del gestionale.
        </p>
        <p>
          Per continuare, consenti i pop-up per{" "}
          <span className="font-medium text-[color:var(--cab-text)]">{request.domain}</span>, poi
          premi <span className="font-medium text-[color:var(--cab-text)]">Riprova</span>. Il
          documento resta pronto: non devi ripetere la procedura.
        </p>
        {showInstructions ? (
          <div className="rounded-[var(--ds-radius-md)] border border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)] p-3">
            <p className="font-medium text-[color:var(--cab-text)]">{instructions.title}</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5">
              {instructions.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </GestionaleConfirmDialog>
  );
}
