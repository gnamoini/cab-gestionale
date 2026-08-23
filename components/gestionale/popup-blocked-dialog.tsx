"use client";

import { useEffect, useState } from "react";
import { GestionaleConfirmDialog, gestionaleConfirmActionsClass } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleModalFooterCancelButton } from "@/components/design-system";
import { dsBtnPrimary, dsFocus } from "@/lib/ui/design-system";
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

  useEffect(() => {
    setShowInstructions(false);
  }, [request?.sessionId]);

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
        className={`${dsBtnPrimary} min-h-[2.75rem] w-full sm:min-h-0 sm:w-auto`}
        onClick={onRetry}
        disabled={retryPending}
      >
        <svg
          className={`h-4 w-4 shrink-0 ${retryPending ? "animate-spin" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
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
        <div className="overflow-hidden rounded-[var(--ds-radius-md)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))]">
          <button
            type="button"
            className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-medium text-[color:var(--cab-text)] transition-colors hover:bg-[var(--cab-hover)] disabled:cursor-not-allowed disabled:opacity-55 ${dsFocus}`}
            onClick={() => setShowInstructions((v) => !v)}
            disabled={retryPending}
            aria-expanded={showInstructions}
          >
            <span>Come abilitare i pop-up nel browser</span>
            <svg
              className={`h-4 w-4 shrink-0 text-[color:var(--cab-text-muted)] transition-transform duration-200 ${showInstructions ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showInstructions ? (
            <div className="border-t border-[color:var(--cab-border)] px-3 py-3 text-[color:var(--cab-text-muted)]">
              <p className="font-medium text-[color:var(--cab-text)]">{instructions.title}</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                {instructions.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </div>
    </GestionaleConfirmDialog>
  );
}
