"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal-shell";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import {
  GestionaleModalFooterCancelButton,
  GestionaleModalFooterSaveButton,
} from "@/components/design-system";
import type { CommunicationDraftPayload } from "@/lib/communications/drafts/communication-draft-types";
import type { AllowedSender } from "@/lib/communications/senders/allowed-senders";
import { formatAllowedSenderLabel } from "@/lib/communications/senders/allowed-senders";
import { dsBtnNeutralForm, dsInput, dsLabel, dsTypoSmall } from "@/lib/ui/design-system";
import { isValidEmail } from "@/lib/validation/email";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

function EmailListEditor({
  id,
  label,
  emails,
  disabled,
  onChange,
  extraAction,
}: {
  id: string;
  label: string;
  emails: string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
  extraAction?: React.ReactNode;
}) {
  const [draft, setDraft] = useState("");

  const addEmail = () => {
    const value = draft.trim();
    if (!value) return;
    if (!isValidEmail(value)) return;
    if (emails.some((e) => e.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...emails, value]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className={dsLabel} htmlFor={id}>
          {label}
        </label>
        {extraAction}
      </div>
      {emails.length > 0 ? (
        <ul className="flex flex-nowrap sm:flex-wrap gap-2">
          {emails.map((email) => (
            <li
              key={email}
              className="flex items-center gap-1 rounded-md border border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)] px-2 py-1 text-sm"
            >
              <span>{email}</span>
              <button
                type="button"
                className="text-[color:var(--cab-text-muted)] hover:text-[color:var(--cab-text)]"
                disabled={disabled}
                onClick={() => onChange(emails.filter((e) => e !== email))}
                aria-label={`Rimuovi ${email}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <input
          id={id}
          className={dsInput}
          type="email"
          value={draft}
          disabled={disabled}
          placeholder="email@esempio.it"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addEmail();
            }
          }}
        />
        <button type="button" className={dsBtnNeutralForm} disabled={disabled} onClick={addEmail}>
          Aggiungi
        </button>
      </div>
    </div>
  );
}

export type EmailComposerState = {
  sender: AllowedSender;
  toEmails: string[];
  ccEmails: string[];
  bccEmails: string[];
  subject: string;
  bodyText: string;
};

export function EmailComposerModal({
  open,
  title,
  loading,
  saving,
  sending,
  payload,
  onClose,
  onSave,
  onSend,
}: {
  open: boolean;
  title: string;
  loading: boolean;
  saving: boolean;
  sending: boolean;
  payload: CommunicationDraftPayload | null;
  onClose: () => void;
  onSave: (state: EmailComposerState & { draftId?: string }) => Promise<boolean>;
  onSend: (state: EmailComposerState & { draftId?: string }) => Promise<boolean>;
}) {
  const gestToast = useGestionaleToast();
  const [state, setState] = useState<EmailComposerState | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open || !payload) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync composer state when payload opens
    setState({
      sender: payload.sender,
      toEmails: [...payload.toEmails],
      ccEmails: [...payload.ccEmails],
      bccEmails: [...payload.bccEmails],
      subject: payload.subject,
      bodyText: payload.bodyText,
    });
  }, [open, payload]);

  const allowedSenders = payload?.allowedSenders ?? [];
  const suggestedSupplierEmails = useMemo(
    () => (payload?.suggestedSupplierEmails ?? []).filter((e) => isValidEmail(e)),
    [payload?.suggestedSupplierEmails],
  );

  const buildState = useCallback((): (EmailComposerState & { draftId?: string }) | null => {
    if (!state) return null;
    return { ...state, draftId: payload?.id };
  }, [payload?.id, state]);

  const scheduleAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      const current = buildState();
      if (!current || sending) return;
      void onSave(current);
    }, 800);
  }, [buildState, onSave, sending]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  const addSuggestedToCc = (email: string) => {
    if (!state) return;
    if (state.toEmails.some((e) => e.toLowerCase() === email.toLowerCase())) return;
    if (state.ccEmails.some((e) => e.toLowerCase() === email.toLowerCase())) return;
    setState({ ...state, ccEmails: [...state.ccEmails, email] });
    scheduleAutosave();
  };

  const handleSave = async () => {
    const current = buildState();
    if (!current) return;
    if (!current.toEmails.length) {
      gestToast.validation("Inserisci almeno un destinatario.");
      return;
    }
    await onSave(current);
  };

  const handleSend = async () => {
    const current = buildState();
    if (!current) return;
    if (!current.toEmails.length) {
      gestToast.validation("Inserisci almeno un destinatario.");
      return;
    }
    await onSend(current);
  };

  if (!open) return null;

  return (
    <GestionaleModalShell
      onRequestClose={onClose}
      title={title}
      modalSize="formLarge"
      modalHeight="standard"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <GestionaleModalFooterCancelButton onClick={onClose} disabled={sending}>
            Annulla
          </GestionaleModalFooterCancelButton>
          <button type="button" className={dsBtnNeutralForm} disabled={loading || saving || sending} onClick={() => void handleSave()}>
            {saving ? "Salvataggio…" : "Salva bozza"}
          </button>
          <GestionaleModalFooterSaveButton disabled={loading || saving || sending} onClick={() => void handleSend()}>
            {sending ? "Invio…" : "Invia"}
          </GestionaleModalFooterSaveButton>
        </div>
      }
    >
      {loading || !state ? (
        <p className={dsTypoSmall}>Caricamento composizione email…</p>
      ) : (
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className={dsLabel}>Da</span>
            <select
              className={dsInput}
              value={`${state.sender.email}::${state.sender.displayName}`}
              disabled={sending || allowedSenders.length <= 1}
              onChange={(e) => {
                const [email, displayName] = e.target.value.split("::");
                const match = allowedSenders.find((s) => s.email === email);
                setState({
                  ...state,
                  sender: match ?? { email: email ?? "", displayName: displayName ?? "" },
                });
                scheduleAutosave();
              }}
            >
              {allowedSenders.map((s) => (
                <option key={s.email} value={`${s.email}::${s.displayName}`}>
                  {formatAllowedSenderLabel(s)}
                </option>
              ))}
            </select>
          </label>

          <EmailListEditor
            id="email-composer-to"
            label="A"
            emails={state.toEmails}
            disabled={sending}
            onChange={(toEmails) => {
              setState({ ...state, toEmails });
              scheduleAutosave();
            }}
          />

          <EmailListEditor
            id="email-composer-cc"
            label="CC"
            emails={state.ccEmails}
            disabled={sending}
            extraAction={
              suggestedSupplierEmails.length > 0 ? (
                <details className="text-sm">
                  <summary className="cursor-pointer text-[color:var(--cab-accent)]">Aggiungi email fornitore</summary>
                  <ul className="mt-2 space-y-1">
                    {suggestedSupplierEmails.map((email) => (
                      <li key={email}>
                        <button
                          type="button"
                          className="text-left text-sm text-[color:var(--cab-accent)] underline"
                          onClick={() => addSuggestedToCc(email)}
                        >
                          {email}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null
            }
            onChange={(ccEmails) => {
              setState({ ...state, ccEmails });
              scheduleAutosave();
            }}
          />

          <EmailListEditor
            id="email-composer-bcc"
            label="BCC"
            emails={state.bccEmails}
            disabled={sending}
            onChange={(bccEmails) => {
              setState({ ...state, bccEmails });
              scheduleAutosave();
            }}
          />

          <label className="block space-y-1">
            <span className={dsLabel}>Oggetto</span>
            <input
              className={dsInput}
              value={state.subject}
              disabled={sending}
              onChange={(e) => {
                setState({ ...state, subject: e.target.value });
                scheduleAutosave();
              }}
            />
          </label>

          <label className="block space-y-1">
            <span className={dsLabel}>Messaggio</span>
            <GestionaleTextarea
              className="min-h-[10rem]"
              size="lg"
              value={state.bodyText}
              disabled={sending}
              onChange={(bodyText) => {
                setState({ ...state, bodyText });
                scheduleAutosave();
              }}
            />
          </label>

          {payload?.attachmentFileName ? (
            <p className={dsTypoSmall}>
              <strong>Allegato:</strong> {payload.attachmentFileName}
            </p>
          ) : null}
        </div>
      )}
    </GestionaleModalShell>
  );
}
