"use client";

import { useEffect, useState } from "react";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

type Preview = {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  attachmentFileName: string;
};

export function OrdineFornitoreSendEmailModal({
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
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !ordineId) return;
    setLoading(true);
    fetch(`/api/ordini-fornitori/${ordineId}/send-preview`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Anteprima non disponibile");
        setPreview(json as Preview);
      })
      .catch((e) => {
        gestToast.errorOnce("ordine-send-preview", e);
        onClose();
      })
      .finally(() => setLoading(false));
  }, [open, ordineId, gestToast, onClose]);

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/ordini-fornitori/${ordineId}/send`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Invio non riuscito");
      gestToast.successOnce("ordine-send", "Ordine in coda per invio email.");
      onSent?.();
      onClose();
    } catch (e) {
      gestToast.errorOnce("ordine-send", e);
    } finally {
      setSending(false);
    }
  };

  const message = loading
    ? "Caricamento anteprima…"
    : preview
      ? (
          <div className="space-y-2 text-sm">
            <p><strong>Destinatario:</strong> {preview.recipientEmail || "—"} ({preview.recipientName})</p>
            <p><strong>Oggetto:</strong> {preview.subject}</p>
            <p><strong>Allegato:</strong> {preview.attachmentFileName}</p>
          </div>
        )
      : null;

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Invia ordine via email"
      message={message}
      confirmLabel={sending ? "Invio…" : "Invia"}
      cancelLabel="Annulla"
      confirmDisabled={loading || sending || !preview?.recipientEmail}
      pending={sending}
      onConfirm={() => void handleSend()}
      onCancel={onClose}
    />
  );
}
