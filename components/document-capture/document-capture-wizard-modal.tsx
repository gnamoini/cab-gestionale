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
import { postCaptureProcessStream } from "@/lib/document-capture/pipeline/analyze-stream-client";
import type { AnalyzeTracePhase } from "@/lib/document-capture/pipeline/analyze-trace-types";
import { useCallback, useRef, useState } from "react";

export type DocumentCaptureWizardStep = Extract<DocumentCaptureFlowStep, "analyze">;

type WizardApi = {
  busy: boolean;
  error: string | null;
  retryAfterSec: number | null;
  analyzePhase: AnalyzeTracePhase | null;
  heartbeatAt: number | null;
  runAnalyze: (captureIdOverride?: string | null, uploadDurationMs?: number) => Promise<boolean>;
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
  const [analyzePhase, setAnalyzePhase] = useState<AnalyzeTracePhase | null>(null);
  const [heartbeatAt, setHeartbeatAt] = useState<number | null>(null);
  const analyzeSeqRef = useRef(0);

  const reset = useCallback(() => {
    analyzeSeqRef.current += 1;
    setBusy(false);
    setError(null);
    setRetryAfterSec(null);
    setAnalyzePhase(null);
    setHeartbeatAt(null);
  }, []);

  const runAnalyze = useCallback(async (captureIdOverride?: string | null, uploadDurationMs?: number) => {
    const id = captureIdOverride ?? captureId;
    if (!id) return false;
    const seq = ++analyzeSeqRef.current;
    setBusy(true);
    setError(null);
    setRetryAfterSec(null);
    setAnalyzePhase(null);
    setHeartbeatAt(null);
    let retryHintSec: number | null = null;
    try {
      const streamed = await postCaptureProcessStream(
        id,
        (event) => {
        if (seq !== analyzeSeqRef.current) return;
        if (event.type === "phase") {
          setAnalyzePhase(event.phase);
        }
        if (event.type === "heartbeat") {
          setHeartbeatAt(Date.now());
          if (event.activePhase) setAnalyzePhase(event.activePhase);
        }
      },
        { uploadDurationMs },
      );
      const body = streamed.body as {
        error?: string;
        code?: string;
        errorType?: string;
        fieldCount?: number;
        ok?: boolean;
      };
      if (seq !== analyzeSeqRef.current) return false;
      retryHintSec = parseRetryAfterHeader(streamed.response.headers.get("Retry-After"));
      if (!streamed.response.ok || body.ok === false) {
        if (body.code === "not_configured") {
          const hint =
            body.errorType === "CONFIG_INVALID_FORMAT" || body.errorType === "AI_KEY_INVALID"
              ? "Chiave API non valida. Verifica in Impostazioni → AI Providers."
              : body.errorType === "CONFIG_NOT_FOUND" || body.errorType === "AI_CONFIG_MISSING"
                ? "Servizio AI non configurato. Aggiungi una chiave in Impostazioni → AI Providers."
                : null;
          throw new Error(hint ?? body.error ?? "Servizio AI non configurato.");
        }
        if (body.code === "not_finalized") {
          throw new Error("Documento non disponibile. Torna indietro e carica di nuovo il file.");
        }
        if (body.code === "no_fields") {
          throw new Error(body.error ?? "Nessun dato letto dalla scheda.");
        }
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

  return { busy, error, retryAfterSec, analyzePhase, heartbeatAt, runAnalyze, reset };
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
