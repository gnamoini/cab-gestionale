"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EmailComposerModal,
  type EmailComposerState,
} from "@/components/communications/email-composer-modal";
import type { CommunicationDraftPayload } from "@/lib/communications/drafts/communication-draft-types";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

export function OrdineFornitoreEmailComposerModal({
  ordineId,
  open,
  onClose,
  onSent,
}: {
  ordineId: string;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}) {
  const gestToast = useGestionaleToast();
  const [payload, setPayload] = useState<CommunicationDraftPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const loadDraft = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/communications/drafts/ordine-fornitore/${ordineId}`);
      const json = (await res.json()) as CommunicationDraftPayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Caricamento bozza non riuscito");
      setPayload(json);
    } catch (e) {
      gestToast.errorOnce("ordine-email-draft-load", e);
      onClose();
    } finally {
      setLoading(false);
    }
  }, [gestToast, onClose, ordineId]);

  useEffect(() => {
    if (!open || !ordineId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load draft when modal opens
    void loadDraft();
  }, [loadDraft, open, ordineId]);

  const persistDraft = async (state: EmailComposerState & { draftId?: string }): Promise<string | null> => {
    const res = await fetch(`/api/communications/drafts/ordine-fornitore/${ordineId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderEmail: state.sender.email,
        senderDisplayName: state.sender.displayName,
        toEmails: state.toEmails,
        ccEmails: state.ccEmails,
        bccEmails: state.bccEmails,
        subject: state.subject,
        bodyText: state.bodyText,
      }),
    });
    const json = (await res.json()) as { draftId?: string; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Salvataggio bozza non riuscito");
    return json.draftId ?? state.draftId ?? null;
  };

  const handleSave = async (state: EmailComposerState & { draftId?: string }) => {
    setSaving(true);
    try {
      const draftId = await persistDraft(state);
      if (draftId) setPayload((prev) => (prev ? { ...prev, id: draftId } : prev));
      gestToast.successOnce("ordine-email-draft-save", "Bozza salvata.");
      return true;
    } catch (e) {
      gestToast.errorOnce("ordine-email-draft-save", e);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (state: EmailComposerState & { draftId?: string }) => {
    setSending(true);
    try {
      const draftId = (await persistDraft(state)) ?? state.draftId;
      if (!draftId) throw new Error("Bozza non disponibile.");

      const res = await fetch(`/api/communications/drafts/${draftId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordineId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Invio non riuscito");

      gestToast.successOnce("ordine-email-send", "Ordine in coda per invio email.");
      onSent?.();
      onClose();
      return true;
    } catch (e) {
      gestToast.errorOnce("ordine-email-send", e);
      return false;
    } finally {
      setSending(false);
    }
  };

  return (
    <EmailComposerModal
      open={open}
      title="Invia ordine via email"
      loading={loading}
      saving={saving}
      sending={sending}
      payload={payload}
      onClose={onClose}
      onSave={handleSave}
      onSend={handleSend}
    />
  );
}
