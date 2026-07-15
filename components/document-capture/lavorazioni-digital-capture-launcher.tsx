"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { LoadingSpinner } from "@/components/design-system/loading";
import {
  GestionaleAiActionButton,
  type GestionaleAiActionButtonSize,
} from "@/components/design-system/gestionale-ai-action-button";
import {
  CaptureMezzoMatchStep,
} from "@/components/document-capture/capture-mezzo-match-step";
import {
  CAPTURE_COMPILE_FORM_ID,
  CaptureSchedaCompileStep,
} from "@/components/document-capture/capture-scheda-compile-step";
import {
  DocumentCaptureWizardBody,
  useDocumentCaptureWizardApi,
} from "@/components/document-capture/document-capture-wizard-modal";
import {
  DOCUMENT_CAPTURE_STEP_COPY,
  DocumentCaptureStepIndicator,
  type DocumentCaptureFlowStep,
} from "@/components/document-capture/document-capture-step-indicator";
import { discardEphemeralCaptureClient } from "@/lib/document-capture/discard-ephemeral-capture.client";
import { deriveCaptureAcquisitionProgress } from "@/lib/document-capture/capture-acquisition-progress";
import { useDocumentCaptureUpload } from "@/lib/document-capture/use-document-capture-upload";
import {
  fetchCaptureFieldRows,
  inferCaptureSchedaTipo,
  type CaptureFieldRow,
} from "@/lib/document-capture/capture-field-mapper";
import { describeCaptureLavorazioneAssignTarget } from "@/lib/document-capture/capture-lavorazione-match";
import { LavorazioniCaptureDropOverlay } from "@/components/document-capture/lavorazioni-capture-drop-overlay";
import { GestionaleModalShell, GestionaleModalScrollBody } from "@/components/gestionale/gestionale-modal";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import { useMagazzinoRicambiUIQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaTipo } from "@/types/schede";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";

export type CaptureSchedeOpenRequest = {
  lavorazioneId: string;
  schedaTipo: Extract<SchedaTipo, "lavorazioni" | "ricambi">;
  fieldRows: CaptureFieldRow[];
};

type CompileView = "ingresso" | "mezzo-match";

type Props = {
  enabled: boolean;
  createdBy: string | null;
  size?: GestionaleAiActionButtonSize;
  className?: string;
  mobileIconOnly?: boolean;
  mezzi?: readonly MezzoGestito[];
  schedeStore?: LavorazioneSchedeStore;
  attive?: readonly LavorazioneAttiva[];
  storico?: readonly LavorazioneArchiviata[];
  sharedGlobalOpts?: GlobalOptionsSlice;
  sharedMezziCatalog?: readonly MezzoGestito[];
  onLavorazioneCreated?: (id: string, opts?: { skipTableFocus?: boolean }) => void;
  onOpenSchedeFromCapture?: (request: CaptureSchedeOpenRequest) => void | Promise<boolean>;
};

export function LavorazioniDigitalCaptureLauncher({
  enabled,
  createdBy,
  size = "md",
  className = "",
  mobileIconOnly = false,
  mezzi = [],
  schedeStore = {},
  attive = [],
  storico = [],
  sharedGlobalOpts,
  sharedMezziCatalog,
  onLavorazioneCreated,
  onOpenSchedeFromCapture,
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DocumentCaptureFlowStep>("hub");
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [compileView, setCompileView] = useState<CompileView>("ingresso");
  const [fieldRows, setFieldRows] = useState<CaptureFieldRow[] | null>(null);
  const [pendingSchedaTipo, setPendingSchedaTipo] = useState<Extract<SchedaTipo, "lavorazioni" | "ricambi"> | null>(
    null,
  );
  const [compileError, setCompileError] = useState<string | null>(null);
  const [compileFieldsLoading, setCompileFieldsLoading] = useState(false);
  const [schedeHandoffBusy, setSchedeHandoffBusy] = useState(false);
  const analyzeTriggeredRef = useRef<string | null>(null);
  const gestToast = useGestionaleToast();

  const { busy: wizardBusy, error, runAnalyze, reset: resetWizardApi } = useDocumentCaptureWizardApi(captureId);
  const {
    phase: uploadPhase,
    error: uploadError,
    progress: uploadProgress,
    upload,
    reset: resetUpload,
  } = useDocumentCaptureUpload();
  const magazzinoQuery = useMagazzinoRicambiUIQuery(undefined, { enabled: open });

  const resetFlow = useCallback(() => {
    setStep("hub");
    setCaptureId(null);
    setCompileView("ingresso");
    setFieldRows(null);
    setPendingSchedaTipo(null);
    setCompileError(null);
    setCompileFieldsLoading(false);
    setSchedeHandoffBusy(false);
    resetWizardApi();
    resetUpload();
    analyzeTriggeredRef.current = null;
  }, [resetUpload, resetWizardApi]);

  const discardCurrentCapture = useCallback(() => {
    if (captureId) discardEphemeralCaptureClient(captureId);
  }, [captureId]);

  const handleClose = useCallback(() => {
    discardCurrentCapture();
    setOpen(false);
    resetFlow();
  }, [discardCurrentCapture, resetFlow]);

  const openSchedeEditor = useCallback(
    async (request: CaptureSchedeOpenRequest, opts?: { handoff?: boolean }): Promise<boolean> => {
      if (opts?.handoff) setSchedeHandoffBusy(true);
      try {
        const opened = (await onOpenSchedeFromCapture?.(request)) ?? false;
        if (!opened) return false;
        discardCurrentCapture();
        setOpen(false);
        resetFlow();
        return true;
      } finally {
        if (opts?.handoff) setSchedeHandoffBusy(false);
      }
    },
    [discardCurrentCapture, onOpenSchedeFromCapture, resetFlow],
  );

  const enterCompileStep = useCallback(async (id: string) => {
    setCompileFieldsLoading(true);
    setCompileError(null);
    try {
      const rows = await fetchCaptureFieldRows(id);
      const schedaTipo = inferCaptureSchedaTipo(rows) ?? "ingresso";
      setFieldRows(rows);
      if (schedaTipo === "ingresso") {
        setCompileView("ingresso");
        setPendingSchedaTipo(null);
      } else {
        setCompileView("mezzo-match");
        setPendingSchedaTipo(schedaTipo);
      }
      setStep("compile");
    } catch (e) {
      setCompileError(e instanceof Error ? e.message : "Impossibile caricare i dati letti");
    } finally {
      setCompileFieldsLoading(false);
    }
  }, []);

  const runCapturePipeline = useCallback(
    async (file: File) => {
      setStep("analyze");
      setCaptureId(null);
      setFieldRows(null);
      analyzeTriggeredRef.current = null;
      resetWizardApi();

      const result = await upload({ file });
      if (!result) {
        gestToast.error(GESTIONALE_TOAST.genericError);
        return;
      }

      if (result.duplicateOf) {
        gestToast.info("Documento già presente in archivio (duplicato).");
      }

      setCaptureId(result.captureId);
      analyzeTriggeredRef.current = result.captureId;
      const ok = await runAnalyze(result.captureId);
      if (ok) await enterCompileStep(result.captureId);
    },
    [enterCompileStep, gestToast, resetWizardApi, runAnalyze, upload],
  );

  const retryAnalyze = useCallback(async () => {
    if (!captureId || wizardBusy) return;
    const ok = await runAnalyze(captureId);
    if (ok) await enterCompileStep(captureId);
  }, [captureId, enterCompileStep, runAnalyze, wizardBusy]);

  const handleFilePicked = useCallback(
    (file: File) => {
      void runCapturePipeline(file);
    },
    [runCapturePipeline],
  );

  const goBack = useCallback(() => {
    if (step === "analyze" || step === "compile") {
      discardCurrentCapture();
      resetFlow();
    }
  }, [discardCurrentCapture, resetFlow, step]);

  const handleAssignToLavorazione = useCallback(
    async (lavorazioneId: string) => {
      if (!fieldRows || !pendingSchedaTipo) return;
      const request: CaptureSchedeOpenRequest = {
        lavorazioneId,
        schedaTipo: pendingSchedaTipo,
        fieldRows,
      };
      const opened = await openSchedeEditor(request, { handoff: true });
      if (opened) {
        gestToast.success(
          `Scheda assegnata a ${describeCaptureLavorazioneAssignTarget(lavorazioneId, attive, schedeStore)}`,
        );
      }
    },
    [attive, fieldRows, gestToast, openSchedeEditor, pendingSchedaTipo, schedeStore],
  );

  const handleCreateNewFromMatch = useCallback(() => {
    setCompileView("ingresso");
  }, []);

  const handleCaptureLavorazioneCreated = useCallback(
    (id: string) => {
      void (async () => {
        if (pendingSchedaTipo && fieldRows) {
          const opened = await openSchedeEditor(
            {
              lavorazioneId: id,
              schedaTipo: pendingSchedaTipo,
              fieldRows,
            },
            { handoff: true },
          );
          if (opened) onLavorazioneCreated?.(id, { skipTableFocus: true });
          return;
        }
        discardCurrentCapture();
        onLavorazioneCreated?.(id);
        setOpen(false);
        resetFlow();
      })();
    },
    [discardCurrentCapture, fieldRows, onLavorazioneCreated, openSchedeEditor, pendingSchedaTipo, resetFlow],
  );

  const acquisition = useMemo(
    () =>
      step === "analyze"
        ? deriveCaptureAcquisitionProgress({
            uploadPhase,
            uploadProgress,
            analyzeBusy: wizardBusy,
            uploadError,
          })
        : null,
    [step, uploadPhase, uploadProgress, uploadError, wizardBusy],
  );

  const pipelineBusy =
    step === "analyze" &&
    (uploadPhase === "uploading" || uploadPhase === "finalizing" || wizardBusy);

  const stepCopy = DOCUMENT_CAPTURE_STEP_COPY[step];
  const footerBusy = wizardBusy || pipelineBusy || compileFieldsLoading || schedeHandoffBusy;

  const showCompileIngressoFooter = step === "compile" && compileView === "ingresso" && fieldRows && captureId;

  if (!enabled) return null;

  return (
    <>
      <GestionaleAiActionButton
        variant="primary"
        size={size}
        iconOnly={mobileIconOnly}
        className={className}
        aria-label="Acquisizione digitale schede"
        onClick={() => setOpen(true)}
      >
        <span className="hidden sm:inline">Acquisizione AI</span>
        {!mobileIconOnly ? <span className="sm:hidden">Acquisizione</span> : null}
      </GestionaleAiActionButton>
      {open ? (
        <GestionaleModalShell
          modalSize="formLarge"
          onRequestClose={handleClose}
          onBack={step !== "hub" ? goBack : undefined}
          title={stepCopy.title}
          subtitle={stepCopy.subtitle}
          titleId="lav-digital-capture-title"
          footer={
            showCompileIngressoFooter ? (
              <div className="flex min-w-0 w-full justify-end gap-2">
                <LoadingButton
                  type="submit"
                  form={CAPTURE_COMPILE_FORM_ID}
                  variant="primary"
                  className={`${erpBtnAccent} min-h-11 sm:min-w-[10rem]`}
                  loading={footerBusy}
                  loadingLabel="Salvataggio…"
                  disabled={!createdBy}
                >
                  Crea lavorazione
                </LoadingButton>
              </div>
            ) : undefined
          }
        >
          <GestionaleModalScrollBody className="space-y-5 [--capture-review-pin-top:5.5rem]">
            <DocumentCaptureStepIndicator current={step} />
            {step === "hub" ? (
              <LavorazioniCaptureDropOverlay enabled onFilePicked={handleFilePicked} />
            ) : null}
            {step === "analyze" ? (
              <DocumentCaptureWizardBody
                captureId={captureId}
                step="analyze"
                acquisition={acquisition}
                error={error ?? compileError}
                onRetryAnalyze={() => void retryAnalyze()}
              />
            ) : null}
            {step === "compile" && captureId && fieldRows ? (
              compileFieldsLoading ? (
                <div className="flex min-h-[12rem] items-center justify-center">
                  <LoadingSpinner size="md" />
                </div>
              ) : compileView === "ingresso" ? (
                <CaptureSchedaCompileStep
                  captureId={captureId}
                  fieldRows={fieldRows}
                  createdBy={createdBy}
                  mezzi={mezzi}
                  schedeStore={schedeStore}
                  attive={attive}
                  storico={storico}
                  sharedGlobalOpts={sharedGlobalOpts}
                  sharedMezziCatalog={sharedMezziCatalog}
                  magazzino={magazzinoQuery.data ?? []}
                  onCreated={handleCaptureLavorazioneCreated}
                  onCompileError={setCompileError}
                />
              ) : pendingSchedaTipo ? (
                <CaptureMezzoMatchStep
                  captureId={captureId}
                  fieldRows={fieldRows}
                  schedaTipo={pendingSchedaTipo}
                  mezzi={mezzi}
                  schedeStore={schedeStore}
                  attive={attive}
                  onAssign={(id) => void handleAssignToLavorazione(id)}
                  onCreateNew={handleCreateNewFromMatch}
                  onCancel={goBack}
                  assignBusy={schedeHandoffBusy}
                />
              ) : null
            ) : null}
            {compileError && step === "compile" ? (
              <p className="text-sm text-[color:var(--cab-danger)]">{compileError}</p>
            ) : null}
          </GestionaleModalScrollBody>
        </GestionaleModalShell>
      ) : null}
      {schedeHandoffBusy ? (
        <div
          className="fixed inset-0 z-[115] flex flex-col items-center justify-center gap-3 bg-[var(--cab-overlay)] backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <LoadingSpinner size="md" />
          <p className="text-sm text-[color:var(--cab-fg)]">Apertura scheda in corso…</p>
        </div>
      ) : null}
    </>
  );
}
