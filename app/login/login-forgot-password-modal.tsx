"use client";

import { useState } from "react";
import { CloseButton, GlobalLoadingSpinner } from "@/components/design-system";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";
import { requestPasswordResetEmail } from "@/lib/auth/request-password-reset.client";
import {
  dsBtnNeutral,
  dsBtnPrimary,
  dsLabel,
  dsModalBackdrop,
  dsModalPanel,
  dsSearchFieldInput,
  dsTypoCaption,
} from "@/lib/ui/design-system";
import { resolveModalMaxWidthClass } from "@/lib/ui/modal-max-width-class";
import { OverlayLayerPriority } from "@/lib/ui/overlay-back-stack";
import { useGestionaleOverlayBehavior } from "@/lib/ui/use-gestionale-overlay-behavior";
import { isValidEmailFormat } from "@/src/lib/auth/username";

const iconInset = "pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[color:var(--cab-text-muted)]";

function IconUser({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export type LoginForgotPasswordModalProps = {
  formId: string;
  initialEmail: string;
  onClose: () => void;
};

export function LoginForgotPasswordModal({ formId, initialEmail, onClose }: LoginForgotPasswordModalProps) {
  useGestionaleOverlayBehavior({
    open: true,
    onRequestClose: onClose,
    source: "login-forgot-password",
    overlayBack: { layer: "modal", priority: OverlayLayerPriority.modal },
  });

  const [resetEmail, setResetEmail] = useState(initialEmail);
  const [resetPending, setResetPending] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetDone(false);
    const trimmed = resetEmail.trim();
    if (!isValidEmailFormat(trimmed)) {
      setResetError("Inserisci un indirizzo email valido.");
      return;
    }
    if (!isSupabasePublicEnvConfigured()) {
      setResetError("Servizio non disponibile. Controlla la configurazione.");
      return;
    }
    setResetPending(true);
    try {
      const res = await requestPasswordResetEmail(trimmed);
      if (!res.ok) {
        setResetError(res.message);
        return;
      }
      setResetDone(true);
    } catch {
      setResetError("Impossibile completare la richiesta. Riprova tra poco.");
    } finally {
      setResetPending(false);
    }
  }

  return (
    <div className={dsModalBackdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`${dsModalPanel} relative mx-auto flex flex-col overflow-hidden shadow-[var(--cab-shadow-md)] ${resolveModalMaxWidthClass("max-w-md")}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-forgot-title`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={`${formId}-forgot-title`} className="text-base font-semibold text-[color:var(--cab-text)]">
            Recupero password
          </h2>
          <CloseButton onClick={onClose} disabled={resetPending} />
        </div>
        <p className={`mt-1.5 ${dsTypoCaption}`}>
          Link di reimpostazione se l&apos;email è associata a un account.
        </p>

        {resetDone ? (
          <p
            className="mt-4 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-success)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-success)_10%,var(--cab-surface))] px-3 py-2.5 text-sm text-[color:var(--cab-text)]"
            role="status"
          >
            <span className="font-medium">Email inviata se l&apos;account esiste.</span>
            <span className={`mt-1 block ${dsTypoCaption}`}>Controlla anche lo spam.</span>
          </p>
        ) : (
          <form onSubmit={submitReset} className="mt-4 space-y-4">
            <div>
              <label htmlFor={`${formId}-reset-email`} className={`block ${dsLabel} text-[color:var(--cab-text)]`}>
                Email
              </label>
              <div className="relative mt-1.5">
                <span className={iconInset} aria-hidden>
                  <IconUser />
                </span>
                <input
                  id={`${formId}-reset-email`}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="nome@azienda.it"
                  className={`${dsSearchFieldInput} min-w-0 pl-10`}
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={resetPending}
                />
              </div>
            </div>
            {resetError ? (
              <p
                className="text-sm font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]"
                role="alert"
              >
                {resetError}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button type="button" className={dsBtnNeutral} onClick={onClose} disabled={resetPending}>
                Annulla
              </button>
              <button type="submit" className={dsBtnPrimary} disabled={resetPending}>
                {resetPending ? (
                  <>
                    <GlobalLoadingSpinner size="sm" className="text-white" />
                    <span>Invio…</span>
                  </>
                ) : (
                  "Invia link"
                )}
              </button>
            </div>
          </form>
        )}

        {resetDone ? (
          <div className="mt-4 flex justify-end">
            <button type="button" className={dsBtnPrimary} onClick={onClose}>
              Chiudi
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
