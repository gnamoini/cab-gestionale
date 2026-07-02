"use client";

import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { CaptureDryRunSummary } from "@/components/document-capture/capture-dry-run-summary";
import { CaptureFieldReviewGrid } from "@/components/document-capture/capture-field-review-grid";
import { useGestionaleModal } from "@/components/gestionale/gestionale-modal";
import { useCallback, useState } from "react";
import { dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";

type Props = {
  captureId: string;
  open: boolean;
  onClose: () => void;
};

export function DocumentCaptureWizardModal({ captureId, open, onClose }: Props) {
  const [step, setStep] = useState<"analyze" | "review" | "dryrun">("analyze");
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalyze = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/document-capture/${captureId}/analyze`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Analisi fallita");
      }
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }, [captureId]);

  const runDryRun = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/document-capture/${captureId}/dry-run`, { method: "POST" });
      if (!res.ok) throw new Error("Dry-run fallito");
      const body = (await res.json()) as { applicationId?: string };
      setApplicationId(body.applicationId ?? null);
      setStep("dryrun");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }, [captureId]);

  if (!open) return null;

  return (
    <GestionaleModalShell
      modalSize="formLarge"
      title="Acquisizione — revisione"
      onRequestClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={dsBtnNeutral} onClick={onClose}>
            Chiudi
          </button>
          {step === "analyze" ? (
            <button type="button" className={dsBtnPrimary} disabled={busy} onClick={() => void runAnalyze()}>
              Analizza
            </button>
          ) : null}
          {step === "review" ? (
            <button type="button" className={dsBtnPrimary} disabled={busy} onClick={() => void runDryRun()}>
              Dry-run
            </button>
          ) : null}
        </div>
      }
    >
      {error ? <p className="text-sm text-[color:var(--cab-danger)]">{error}</p> : null}
      {step === "analyze" ? <p className="text-sm">Avvia estrazione AI del documento finalizzato.</p> : null}
      {step === "review" ? <CaptureFieldReviewGrid captureId={captureId} /> : null}
      {step === "dryrun" ? (
        <CaptureDryRunSummary captureId={captureId} applicationId={applicationId} />
      ) : null}
    </GestionaleModalShell>
  );
}

export function DocumentCaptureWizardLauncher(props: { captureId: string }) {
  const modal = useGestionaleModal();
  return (
    <>
      <button type="button" className={dsBtnNeutral} onClick={modal.onOpen}>
        Wizard AI
      </button>
      <DocumentCaptureWizardModal captureId={props.captureId} open={modal.open} onClose={modal.onClose} />
    </>
  );
}
