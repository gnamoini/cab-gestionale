"use client";

import { useCallback, useState } from "react";
import { dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";

export function CaptureDryRunSummary(props: {
  captureId: string;
  applicationId: string | null;
  captureStatus?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = useCallback(async () => {
    if (!props.applicationId || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/document-capture/${props.captureId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: props.applicationId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string; lavorazioneId?: string };
      if (res.status === 409 && body.code === "PLAN_STALE") {
        setMessage("Piano obsoleto — ripetere dry-run.");
        return;
      }
      if (res.status === 409 && body.code === "APPLY_IN_PROGRESS") {
        setMessage("Apply già in corso — attendere.");
        return;
      }
      if (!res.ok) {
        setMessage(body.error ?? "Apply fallito");
        return;
      }
      setMessage(`Apply completato. Lavorazione: ${body.lavorazioneId ?? "—"}`);
    } finally {
      setBusy(false);
    }
  }, [busy, props.applicationId, props.captureId]);

  const resume = useCallback(async () => {
    if (!props.applicationId || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/document-capture/${props.captureId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: props.applicationId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; lavorazioneId?: string };
      if (!res.ok) {
        setMessage(body.error ?? "Resume fallito");
        return;
      }
      setMessage(`Resume completato. Lavorazione: ${body.lavorazioneId ?? "—"}`);
    } finally {
      setBusy(false);
    }
  }, [busy, props.applicationId, props.captureId]);

  const canResume = props.captureStatus === "failed";

  return (
    <div className="space-y-3 text-sm">
      <p>Riepilogo dry-run pronto. Conferma apply gestionale.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={dsBtnPrimary} disabled={!props.applicationId || busy} onClick={() => void apply()}>
          {busy ? "Apply…" : "Applica"}
        </button>
        {canResume ? (
          <button type="button" className={dsBtnNeutral} disabled={!props.applicationId || busy} onClick={() => void resume()}>
            Riprendi apply fallito
          </button>
        ) : null}
      </div>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
