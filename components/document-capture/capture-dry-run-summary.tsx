"use client";

import { useCallback, useState } from "react";

export function useCaptureConfirmActions(captureId: string, applicationId: string | null, captureStatus?: string) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = useCallback(async () => {
    if (!applicationId || busy) return false;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/document-capture/${captureId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string; lavorazioneId?: string };
      if (res.status === 409 && body.code === "PLAN_STALE") {
        setMessage("Anteprima non aggiornata — torna indietro e ripeti il controllo.");
        return false;
      }
      if (res.status === 409 && body.code === "APPLY_IN_PROGRESS") {
        setMessage("Creazione già in corso — attendi qualche secondo.");
        return false;
      }
      if (!res.ok) {
        setMessage(body.error ?? "Creazione lavorazione non riuscita");
        return false;
      }
      setMessage(`Lavorazione creata con successo${body.lavorazioneId ? ` (ID: ${body.lavorazioneId})` : ""}.`);
      return true;
    } finally {
      setBusy(false);
    }
  }, [applicationId, busy, captureId]);

  const resume = useCallback(async () => {
    if (!applicationId || busy) return false;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/document-capture/${captureId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; lavorazioneId?: string };
      if (!res.ok) {
        setMessage(body.error ?? "Ripresa creazione non riuscita");
        return false;
      }
      setMessage(`Lavorazione creata con successo${body.lavorazioneId ? ` (ID: ${body.lavorazioneId})` : ""}.`);
      return true;
    } finally {
      setBusy(false);
    }
  }, [applicationId, busy, captureId]);

  return {
    apply,
    resume,
    busy,
    message,
    canApply: Boolean(applicationId),
    canResume: captureStatus === "failed",
  };
}

export function CaptureDryRunSummary({
  message,
  canResume,
}: {
  message: string | null;
  canResume?: boolean;
}) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-[color:var(--cab-muted-fg)]">
        Controlla l&apos;anteprima, poi premi «Crea lavorazione» per registrare i dati nel gestionale.
      </p>
      {canResume ? (
        <p className="text-xs text-[color:var(--cab-muted-fg)]">
          La creazione precedente non è andata a buon fine: puoi riprovare con «Riprendi creazione».
        </p>
      ) : null}
      {message ? (
        <p className={message.includes("successo") ? "text-[color:var(--cab-success-fg)]" : undefined}>{message}</p>
      ) : null}
    </div>
  );
}
