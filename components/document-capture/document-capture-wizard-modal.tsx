"use client";

import { CaptureDocumentFilePreview } from "@/components/document-capture/capture-document-file-preview";
import { DocumentCaptureAcquisitionProgress } from "@/components/document-capture/document-capture-acquisition-progress";
import type { CaptureAcquisitionProgressState } from "@/lib/document-capture/capture-acquisition-progress";
import type { DocumentCaptureFlowStep } from "@/components/document-capture/document-capture-step-indicator";
import {
  CaptureFieldReviewGrid,
  type CaptureFieldReviewGridHandle,
} from "@/components/document-capture/capture-field-review-grid";
import { useCallback, useRef, useState, type Ref } from "react";

export type DocumentCaptureWizardStep = Extract<DocumentCaptureFlowStep, "analyze" | "review">;

type WizardApi = {
  busy: boolean;
  error: string | null;
  runAnalyze: (captureIdOverride?: string | null) => Promise<boolean>;
  reset: () => void;
};

export function useDocumentCaptureWizardApi(captureId: string | null): WizardApi {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analyzeSeqRef = useRef(0);

  const reset = useCallback(() => {
    analyzeSeqRef.current += 1;
    setBusy(false);
    setError(null);
  }, []);

  const runAnalyze = useCallback(async (captureIdOverride?: string | null) => {
    const id = captureIdOverride ?? captureId;
    if (!id) return false;
    const seq = ++analyzeSeqRef.current;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/document-capture/${id}/analyze`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        fieldCount?: number;
      };
      if (seq !== analyzeSeqRef.current) return false;
      if (!res.ok) {
        if (body.code === "not_configured") {
          throw new Error(body.error ?? "Servizio AI non configurato.");
        }
        if (body.code === "not_finalized") {
          throw new Error("Documento non disponibile. Torna indietro e carica di nuovo il file.");
        }
        if (body.code === "no_fields") {
          throw new Error(body.error ?? "Nessun dato letto dalla scheda.");
        }
        throw new Error(body.error ?? "Lettura documento non riuscita");
      }
      if ((body.fieldCount ?? 0) === 0) {
        throw new Error("Nessun dato letto dalla scheda. Verifica che foto o PDF siano nitidi e riprova.");
      }
      setError(null);
      return true;
    } catch (e) {
      if (seq !== analyzeSeqRef.current) return false;
      setError(e instanceof Error ? e.message : "Errore durante la lettura");
      return false;
    } finally {
      if (seq === analyzeSeqRef.current) setBusy(false);
    }
  }, [captureId]);

  return { busy, error, runAnalyze, reset };
}

export function DocumentCaptureWizardBody({
  captureId,
  step,
  acquisition,
  error,
  onRetryAnalyze,
  reviewSaveRef,
  catalogValidation,
  sharedGlobalOpts,
  magazzino,
  mezzi,
}: {
  captureId: string | null;
  step: DocumentCaptureWizardStep;
  acquisition?: CaptureAcquisitionProgressState | null;
  error: string | null;
  onRetryAnalyze?: () => void;
  reviewSaveRef?: Ref<CaptureFieldReviewGridHandle | null>;
  catalogValidation?: import("@/lib/document-capture/capture-catalog-validation").CaptureCatalogValidationInput | null;
  sharedGlobalOpts?: import("@/src/hooks/use-global-options").GlobalOptionsSlice;
  magazzino?: import("@/lib/magazzino/types").RicambioMagazzino[];
  mezzi?: readonly import("@/lib/mezzi/types").MezzoGestito[];
}) {
  const acquisitionActive = acquisition?.active ?? false;

  return (
    <div className="relative min-h-[12rem]">
      {error && !acquisitionActive && step === "analyze" ? (
        <div className="mb-3 space-y-2">
          <p className="text-sm text-[color:var(--cab-danger)]">{error}</p>
          {onRetryAnalyze ? (
            <button type="button" className="text-xs underline" onClick={onRetryAnalyze}>
              Riprova lettura
            </button>
          ) : null}
        </div>
      ) : null}
      {acquisitionActive || acquisition?.error ? (
        <DocumentCaptureAcquisitionProgress state={acquisition!} />
      ) : (
        <>
          {step === "analyze" && captureId && !error ? (
            <div className="space-y-4">
              <CaptureDocumentFilePreview captureId={captureId} compact />
            </div>
          ) : null}
          {step === "review" && captureId ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <CaptureDocumentFilePreview captureId={captureId} />
              <CaptureFieldReviewGrid
                captureId={captureId}
                saveRef={reviewSaveRef}
                catalogValidation={catalogValidation}
                sharedGlobalOpts={sharedGlobalOpts}
                magazzino={magazzino}
                mezzi={mezzi}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
