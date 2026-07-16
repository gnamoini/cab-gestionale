"use client";

import { CaptureDocumentFilePreview } from "@/components/document-capture/capture-document-file-preview";
import { DocumentCaptureAcquisitionProgress } from "@/components/document-capture/document-capture-acquisition-progress";
import type { CaptureAcquisitionProgressState } from "@/lib/document-capture/capture-acquisition-progress";
import type { DocumentCaptureFlowStep } from "@/components/document-capture/document-capture-step-indicator";
import {
  formatCaptureAnalyzeErrorMessage,
  formatRetryCountdownLabel,
  GEMINI_API_USAGE_URL,
  isGeminiQuotaErrorMessage,
  parseGeminiRetryAfterSec,
} from "@/lib/ai/gemini-retry-after";
import { useRetryAfterCountdown } from "@/src/hooks/use-retry-after-countdown";
import { useCallback, useRef, useState } from "react";

export type DocumentCaptureWizardStep = Extract<DocumentCaptureFlowStep, "analyze">;

type WizardApi = {
  busy: boolean;
  error: string | null;
  retryAfterSec: number | null;
  runAnalyze: (captureIdOverride?: string | null) => Promise<boolean>;
  reset: () => void;
};

function parseRetryAfterHeader(header: string | null): number | null {
  if (!header?.trim()) return null;
  const n = Number.parseInt(header.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function useDocumentCaptureWizardApi(captureId: string | null): WizardApi {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfterSec, setRetryAfterSec] = useState<number | null>(null);
  const analyzeSeqRef = useRef(0);

  const reset = useCallback(() => {
    analyzeSeqRef.current += 1;
    setBusy(false);
    setError(null);
    setRetryAfterSec(null);
  }, []);

  const runAnalyze = useCallback(async (captureIdOverride?: string | null) => {
    const id = captureIdOverride ?? captureId;
    if (!id) return false;
    const seq = ++analyzeSeqRef.current;
    setBusy(true);
    setError(null);
    setRetryAfterSec(null);
    let retryHintSec: number | null = null;
    try {
      const res = await fetch(`/api/document-capture/${id}/analyze`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        fieldCount?: number;
      };
      if (seq !== analyzeSeqRef.current) return false;
      retryHintSec = parseRetryAfterHeader(res.headers.get("Retry-After"));
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
        // #region agent log
        fetch("http://127.0.0.1:7863/ingest/89dc6c11-bff2-45f2-876e-83e3ac496a5d", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "bd086a" },
          body: JSON.stringify({
            sessionId: "bd086a",
            hypothesisId: "ANALYZE_CLIENT",
            location: "document-capture-wizard-modal.tsx",
            message: "analyze api failed",
            data: { status: res.status, code: body.code, error: body.error, captureId: id },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        const errMsg = body.error ?? "Lettura documento non riuscita";
        retryHintSec = parseGeminiRetryAfterSec(errMsg) ?? retryHintSec;
        throw new Error(errMsg);
      }
      if ((body.fieldCount ?? 0) === 0) {
        throw new Error("Nessun dato letto dalla scheda. Verifica che foto o PDF siano nitidi e riprova.");
      }
      setError(null);
      setRetryAfterSec(null);
      return true;
    } catch (e) {
      if (seq !== analyzeSeqRef.current) return false;
      const msg = e instanceof Error ? e.message : "Errore durante la lettura";
      setError(msg);
      setRetryAfterSec(parseGeminiRetryAfterSec(msg) ?? retryHintSec);
      return false;
    } finally {
      if (seq === analyzeSeqRef.current) setBusy(false);
    }
  }, [captureId]);

  return { busy, error, retryAfterSec, runAnalyze, reset };
}

export function DocumentCaptureWizardBody({
  captureId,
  step,
  acquisition,
  error,
  retryAfterSec = null,
  onRetryAnalyze,
}: {
  captureId: string | null;
  step: DocumentCaptureWizardStep;
  acquisition?: CaptureAcquisitionProgressState | null;
  error: string | null;
  retryAfterSec?: number | null;
  onRetryAnalyze?: () => void;
}) {
  const acquisitionActive = acquisition?.active ?? false;
  const { remainingSec, ready } = useRetryAfterCountdown(retryAfterSec);
  const showCountdown = retryAfterSec != null && remainingSec > 0;
  const showUsageLink = Boolean(error && isGeminiQuotaErrorMessage(error));

  return (
    <div className="relative min-h-[12rem]">
      {error && !acquisitionActive && step === "analyze" ? (
        <div className="mb-3 space-y-2">
          <p className="text-sm text-[color:var(--cab-danger)]">{formatCaptureAnalyzeErrorMessage(error)}</p>
          {showUsageLink ? (
            <a
              href={GEMINI_API_USAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-[color:var(--cab-primary)] underline underline-offset-2 hover:opacity-90"
            >
              Controlla utilizzo API Gemini
            </a>
          ) : null}
          {showCountdown ? (
            <p className="text-sm tabular-nums text-[color:var(--cab-text-muted)]" aria-live="polite">
              Puoi riprovare tra{" "}
              <span className="font-medium text-[color:var(--cab-text)]">
                {formatRetryCountdownLabel(remainingSec)}
              </span>
            </p>
          ) : null}
          {onRetryAnalyze ? (
            <button
              type="button"
              className="text-xs underline disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!ready}
              onClick={onRetryAnalyze}
            >
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
        </>
      )}
    </div>
  );
}
