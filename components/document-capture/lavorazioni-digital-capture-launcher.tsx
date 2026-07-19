"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
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
import { CaptureMultiSchedaNotice } from "@/components/document-capture/capture-multi-scheda-notice";
import {
  captureMultiSchedaPostIngressoQueue,
  checkCaptureIngressoVsSheetsIdent,
  checkCaptureMultiSchedaIdentMismatches,
  detectCaptureSchedaTipos,
  formatCaptureMultiSchedaLabels,
  isCaptureMultiSchedaBundle,
  type CaptureSchedaTipoDetected,
} from "@/lib/document-capture/capture-multi-scheda";
import { LavorazioniCaptureDropOverlay } from "@/components/document-capture/lavorazioni-capture-drop-overlay";
import { GestionaleModalShell, GestionaleModalScrollBody } from "@/components/gestionale/gestionale-modal";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { cabModalZConfirm } from "@/lib/ui/mobile-modal-behavior";
import {
  captureAcquisitionDraftStillValid,
  clearCaptureAcquisitionDraft,
  readCaptureAcquisitionDraft,
  saveCaptureAcquisitionDraft,
  type CaptureAcquisitionDraft,
} from "@/lib/document-capture/capture-acquisition-draft";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import { useMagazzinoRicambiUIQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaTipo } from "@/types/schede";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { isDocumentCaptureLauncherApplyV1ClientEnabled } from "@/lib/document-capture/document-capture-launcher-apply-v1.client";
import {
  CaptureDuplicateDialog,
  type CaptureDuplicateContext,
} from "@/components/document-capture/capture-duplicate-dialog";
import { useCaptureApplyFlow } from "@/lib/document-capture/use-capture-apply-flow";

export type CaptureSchedeOpenRequest = {
  lavorazioneId: string;
  schedaTipo: Extract<SchedaTipo, "lavorazioni" | "ricambi">;
  fieldRows: CaptureFieldRow[];
  /** Dopo il primo stage, apri in sequenza (es. lavorazioni → ricambi). */
  sequentialStages?: Array<Extract<SchedaTipo, "lavorazioni" | "ricambi">>;
  identMismatchWarnings?: string[];
  multiSchedaLabels?: string;
};

type CompileView = "ingresso" | "mezzo-match";

export type LavorazioniCapturePageDropHandle = {
  openWithFile: (file: File) => void;
};

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
  /** Drop file sulla pagina Lavorazioni → apre il modal acquisizione AI. */
  pageDropRef?: MutableRefObject<LavorazioniCapturePageDropHandle | null>;
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
  pageDropRef,
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
  const [resumePromptOpen, setResumePromptOpen] = useState(false);
  const [resumeDraft, setResumeDraft] = useState<CaptureAcquisitionDraft | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [detectedSchedaTipos, setDetectedSchedaTipos] = useState<CaptureSchedaTipoDetected[]>([]);
  const [multiSchedaPromptOpen, setMultiSchedaPromptOpen] = useState(false);
  const [pendingMultiSchedaQueue, setPendingMultiSchedaQueue] = useState<
    Array<Extract<SchedaTipo, "lavorazioni" | "ricambi">>
  >([]);
  const [identMismatchWarnings, setIdentMismatchWarnings] = useState<string[]>([]);
  const [identMismatchConfirmOpen, setIdentMismatchConfirmOpen] = useState(false);
  const [pendingHandoffLavorazioneId, setPendingHandoffLavorazioneId] = useState<string | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [pendingDuplicateOf, setPendingDuplicateOf] = useState<string | null>(null);
  const [pendingUploadCaptureId, setPendingUploadCaptureId] = useState<string | null>(null);
  const applyV1 = isDocumentCaptureLauncherApplyV1ClientEnabled();
  const assignApplyFlow = useCaptureApplyFlow(applyV1 ? captureId : null);
  const analyzeTriggeredRef = useRef<string | null>(null);
  const gestToast = useGestionaleToast();

  const { busy: wizardBusy, error, retryAfterSec, runAnalyze, reset: resetWizardApi } = useDocumentCaptureWizardApi(captureId);
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
    setDetectedSchedaTipos([]);
    setMultiSchedaPromptOpen(false);
    setPendingMultiSchedaQueue([]);
    setIdentMismatchWarnings([]);
    setIdentMismatchConfirmOpen(false);
    setPendingHandoffLavorazioneId(null);
    resetWizardApi();
    resetUpload();
    analyzeTriggeredRef.current = null;
  }, [resetUpload, resetWizardApi]);

  const discardCurrentCapture = useCallback(() => {
    if (captureId) discardEphemeralCaptureClient(captureId);
  }, [captureId]);

  const handleClose = useCallback(() => {
    if (captureId && step !== "hub") {
      saveCaptureAcquisitionDraft({
        captureId,
        step,
        compileView,
        pendingSchedaTipo,
      });
    }
    setOpen(false);
    resetFlow();
  }, [captureId, compileView, pendingSchedaTipo, resetFlow, step]);

  const handleOpenRequest = useCallback(() => {
    const draft = readCaptureAcquisitionDraft();
    if (draft) {
      setResumeDraft(draft);
      setResumePromptOpen(true);
      return;
    }
    setOpen(true);
  }, []);

  const handleResumeDiscard = useCallback(() => {
    if (resumeDraft) discardEphemeralCaptureClient(resumeDraft.captureId);
    clearCaptureAcquisitionDraft();
    setResumeDraft(null);
    setResumePromptOpen(false);
    resetFlow();
    setOpen(true);
  }, [resetFlow, resumeDraft]);

  const openSchedeEditor = useCallback(
    async (request: CaptureSchedeOpenRequest, opts?: { handoff?: boolean }): Promise<boolean> => {
      if (opts?.handoff) setSchedeHandoffBusy(true);
      try {
        const opened = (await onOpenSchedeFromCapture?.(request)) ?? false;
        if (!opened) return false;
        discardCurrentCapture();
        clearCaptureAcquisitionDraft();
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
      const tipos = detectCaptureSchedaTipos(rows);
      setDetectedSchedaTipos(tipos);
      setFieldRows(rows);

      if (isCaptureMultiSchedaBundle(tipos)) {
        const queue = captureMultiSchedaPostIngressoQueue(tipos);
        setPendingMultiSchedaQueue(queue);
        setIdentMismatchWarnings(checkCaptureMultiSchedaIdentMismatches(rows));
        setCompileView("ingresso");
        setPendingSchedaTipo(null);
        setMultiSchedaPromptOpen(true);
      } else {
        setPendingMultiSchedaQueue([]);
        setIdentMismatchWarnings([]);
        const schedaTipo = inferCaptureSchedaTipo(rows) ?? "ingresso";
        if (schedaTipo === "ingresso") {
          setCompileView("ingresso");
          setPendingSchedaTipo(null);
        } else {
          setCompileView("mezzo-match");
          setPendingSchedaTipo(schedaTipo);
        }
      }
      setStep("compile");
    } catch (e) {
      setCompileError(e instanceof Error ? e.message : "Impossibile caricare i dati letti");
    } finally {
      setCompileFieldsLoading(false);
    }
  }, []);

  const runMultiSchedaHandoff = useCallback(
    async (lavorazioneId: string, warnings: string[]) => {
      if (!fieldRows || pendingMultiSchedaQueue.length === 0) return false;
      const [first, ...rest] = pendingMultiSchedaQueue;
      const opened = await openSchedeEditor(
        {
          lavorazioneId,
          schedaTipo: first,
          fieldRows,
          sequentialStages: rest.length > 0 ? rest : undefined,
          identMismatchWarnings: warnings,
          multiSchedaLabels: formatCaptureMultiSchedaLabels(detectedSchedaTipos),
        },
        { handoff: true },
      );
      if (opened) onLavorazioneCreated?.(lavorazioneId, { skipTableFocus: true });
      return opened;
    },
    [detectedSchedaTipos, fieldRows, onLavorazioneCreated, openSchedeEditor, pendingMultiSchedaQueue],
  );

  const restoreFromDraft = useCallback(
    async (draft: CaptureAcquisitionDraft) => {
      setCaptureId(draft.captureId);
      if (draft.step === "compile") {
        await enterCompileStep(draft.captureId);
        if (draft.compileView === "ingresso" && draft.pendingSchedaTipo) {
          setCompileView("ingresso");
          setPendingSchedaTipo(draft.pendingSchedaTipo);
        }
      } else {
        setStep("analyze");
      }
      clearCaptureAcquisitionDraft();
    },
    [enterCompileStep],
  );

  const handleResumeConfirm = useCallback(async () => {
    if (!resumeDraft) return;
    setResumeBusy(true);
    try {
      const valid = await captureAcquisitionDraftStillValid(resumeDraft.captureId);
      setResumePromptOpen(false);
      if (!valid) {
        gestToast.info("L'acquisizione salvata non è più disponibile.");
        discardEphemeralCaptureClient(resumeDraft.captureId);
        clearCaptureAcquisitionDraft();
        setResumeDraft(null);
        setOpen(true);
        return;
      }
      setOpen(true);
      await restoreFromDraft(resumeDraft);
      setResumeDraft(null);
    } finally {
      setResumeBusy(false);
    }
  }, [gestToast, restoreFromDraft, resumeDraft]);

  const continueAfterUpload = useCallback(
    async (captureIdToUse: string, duplicateOf?: string | null) => {
      if (duplicateOf && applyV1) {
        setPendingDuplicateOf(duplicateOf);
        setPendingUploadCaptureId(captureIdToUse);
        setDuplicateDialogOpen(true);
        return;
      }
      setCaptureId(captureIdToUse);
      analyzeTriggeredRef.current = captureIdToUse;
      const ok = await runAnalyze(captureIdToUse);
      if (ok) await enterCompileStep(captureIdToUse);
    },
    [applyV1, enterCompileStep, runAnalyze],
  );

  const runCapturePipeline = useCallback(
    async (file: File) => {
      clearCaptureAcquisitionDraft();
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

      if (result.duplicateOf && !applyV1) {
        gestToast.info("Documento già presente in archivio (duplicato).");
      }

      await continueAfterUpload(result.captureId, result.duplicateOf ?? null);
    },
    [applyV1, continueAfterUpload, gestToast, resetWizardApi, upload],
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

  const openCaptureWithFile = useCallback(
    (file: File) => {
      clearCaptureAcquisitionDraft();
      setResumeDraft(null);
      setResumePromptOpen(false);
      setOpen(true);
      void runCapturePipeline(file);
    },
    [runCapturePipeline],
  );

  useEffect(() => {
    if (!pageDropRef) return;
    pageDropRef.current = { openWithFile: openCaptureWithFile };
    return () => {
      pageDropRef.current = null;
    };
  }, [openCaptureWithFile, pageDropRef]);

  const goBack = useCallback(() => {
    if (step === "analyze" || step === "compile") {
      discardCurrentCapture();
      clearCaptureAcquisitionDraft();
      resetFlow();
    }
  }, [discardCurrentCapture, resetFlow, step]);

  const handleAssignToLavorazione = useCallback(
    async (lavorazioneId: string) => {
      if (!fieldRows || !pendingSchedaTipo || !captureId) return;
      if (applyV1) {
        setSchedeHandoffBusy(true);
        try {
          await fetch(`/api/document-capture/${captureId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lavorazioneId }),
          });
          const result = await assignApplyFlow.applyAssignOnly();
          gestToast.success(
            `Scheda applicata a ${describeCaptureLavorazioneAssignTarget(lavorazioneId, attive, schedeStore)}`,
          );
          onLavorazioneCreated?.(result.lavorazioneId);
          setOpen(false);
          resetFlow();
        } catch (e) {
          gestToast.error(e instanceof Error ? e.message : "Apply non riuscito");
        } finally {
          setSchedeHandoffBusy(false);
        }
        return;
      }
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
    [
      applyV1,
      assignApplyFlow,
      attive,
      captureId,
      fieldRows,
      gestToast,
      onLavorazioneCreated,
      openSchedeEditor,
      pendingSchedaTipo,
      resetFlow,
      schedeStore,
    ],
  );

  const handleCreateNewFromMatch = useCallback(() => {
    setCompileView("ingresso");
  }, []);

  const handleCaptureLavorazioneCreated = useCallback(
    (id: string) => {
      void (async () => {
        if (pendingMultiSchedaQueue.length > 0 && fieldRows) {
          const ingressoCampi = schedeStore[id]?.ingresso?.campi;
          const warnings = ingressoCampi
            ? [
                ...new Set([
                  ...identMismatchWarnings,
                  ...checkCaptureIngressoVsSheetsIdent(ingressoCampi, fieldRows, pendingMultiSchedaQueue),
                ]),
              ]
            : identMismatchWarnings;
          if (warnings.length > 0) {
            setIdentMismatchWarnings(warnings);
            setPendingHandoffLavorazioneId(id);
            setIdentMismatchConfirmOpen(true);
            return;
          }
          await runMultiSchedaHandoff(id, warnings);
          return;
        }
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
        clearCaptureAcquisitionDraft();
        onLavorazioneCreated?.(id);
        setOpen(false);
        resetFlow();
      })();
    },
    [
      discardCurrentCapture,
      fieldRows,
      identMismatchWarnings,
      onLavorazioneCreated,
      openSchedeEditor,
      pendingMultiSchedaQueue,
      pendingSchedaTipo,
      resetFlow,
      runMultiSchedaHandoff,
      schedeStore,
    ],
  );

  const handleApplySuccess = useCallback(
    (id: string) => {
      if (applyV1) {
        clearCaptureAcquisitionDraft();
        onLavorazioneCreated?.(id);
        setOpen(false);
        resetFlow();
        gestToast.success("Lavorazione creata da acquisizione AI.");
        return;
      }
      handleCaptureLavorazioneCreated(id);
    },
    [applyV1, gestToast, handleCaptureLavorazioneCreated, onLavorazioneCreated, resetFlow],
  );

  const handleDuplicateCancel = useCallback(() => {
    setDuplicateDialogOpen(false);
    setPendingDuplicateOf(null);
    if (pendingUploadCaptureId) discardEphemeralCaptureClient(pendingUploadCaptureId);
    setPendingUploadCaptureId(null);
    resetFlow();
    setStep("hub");
  }, [pendingUploadCaptureId, resetFlow]);

  const handleDuplicateOpenExisting = useCallback(
    (ctx: CaptureDuplicateContext) => {
      setDuplicateDialogOpen(false);
      if (ctx.lavorazioneId) {
        onLavorazioneCreated?.(ctx.lavorazioneId);
        setOpen(false);
        resetFlow();
      }
    },
    [onLavorazioneCreated, resetFlow],
  );

  const handleDuplicateAttach = useCallback(
    async (ctx: CaptureDuplicateContext) => {
      setDuplicateDialogOpen(false);
      if (!pendingUploadCaptureId) return;
      await fetch(`/api/document-capture/${pendingUploadCaptureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lavorazioneId: ctx.lavorazioneId ?? null }),
      });
      setCaptureId(pendingUploadCaptureId);
      await continueAfterUpload(pendingUploadCaptureId, null);
      setPendingDuplicateOf(null);
      setPendingUploadCaptureId(null);
    },
    [continueAfterUpload, pendingUploadCaptureId],
  );

  const handleDuplicateForceNew = useCallback(
    async (_ctx: CaptureDuplicateContext, reason: string) => {
      setDuplicateDialogOpen(false);
      const id = pendingUploadCaptureId;
      if (!id) return;
      await fetch(`/api/document-capture/${id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "duplicate_override",
          idempotencyKey: `duplicate_override:${id}:${Date.now()}`,
          payload: { reason, duplicateOf: pendingDuplicateOf },
        }),
      }).catch(() => null);
      setCaptureId(id);
      analyzeTriggeredRef.current = id;
      const ok = await runAnalyze(id);
      if (ok) await enterCompileStep(id);
      setPendingDuplicateOf(null);
      setPendingUploadCaptureId(null);
    },
    [enterCompileStep, pendingDuplicateOf, pendingUploadCaptureId, runAnalyze],
  );

  const handleIdentMismatchProceed = useCallback(() => {
    const id = pendingHandoffLavorazioneId;
    if (!id) return;
    setIdentMismatchConfirmOpen(false);
    setPendingHandoffLavorazioneId(null);
    void runMultiSchedaHandoff(id, identMismatchWarnings);
  }, [identMismatchWarnings, pendingHandoffLavorazioneId, runMultiSchedaHandoff]);

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
  const isMultiSchedaFlow = isCaptureMultiSchedaBundle(detectedSchedaTipos);

  if (!enabled) return null;

  return (
    <>
      <GestionaleAiActionButton
        variant="primary"
        size={size}
        iconOnly={mobileIconOnly}
        className={className}
        aria-label="Acquisizione digitale schede"
        onClick={handleOpenRequest}
      >
        <span className="hidden sm:inline">Acquisizione AI</span>
        {!mobileIconOnly ? <span className="sm:hidden">AI</span> : null}
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
                  loadingLabel={applyV1 ? "Import…" : "Salvataggio…"}
                  disabled={!createdBy}
                >
                  {applyV1 ? "Conferma import" : "Crea lavorazione"}
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
                retryAfterSec={error ? retryAfterSec : null}
                onRetryAnalyze={() => void retryAnalyze()}
              />
            ) : null}
            {step === "compile" && captureId && fieldRows ? (
              compileFieldsLoading ? (
                <div className="flex min-h-[12rem] items-center justify-center">
                  <LoadingSpinner size="md" />
                </div>
              ) : (
                <>
                  {isMultiSchedaFlow ? (
                    <CaptureMultiSchedaNotice
                      schedaLabels={formatCaptureMultiSchedaLabels(detectedSchedaTipos)}
                      identWarnings={identMismatchWarnings}
                    />
                  ) : null}
                  {compileView === "ingresso" ? (
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
                  applyMode={applyV1}
                  onApplySuccess={handleApplySuccess}
                  onCreated={applyV1 ? undefined : handleCaptureLavorazioneCreated}
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
                  ) : null}
                </>
              )
            ) : null}
            {compileError && step === "compile" ? (
              <p className="text-sm text-[color:var(--cab-danger)]">{compileError}</p>
            ) : null}
          </GestionaleModalScrollBody>
        </GestionaleModalShell>
      ) : null}
      <GestionaleConfirmDialog
        open={resumePromptOpen}
        title="Riprendere l'acquisizione?"
        subtitle="Hai un'acquisizione AI interrotta."
        message="Vuoi continuare da dove eri rimasto o ricominciare da capo?"
        confirmLabel="Riprendi"
        cancelLabel="Ricomincia"
        pending={resumeBusy}
        layerClassName={cabModalZConfirm}
        onCancel={handleResumeDiscard}
        onConfirm={() => void handleResumeConfirm()}
      />
      <GestionaleConfirmDialog
        open={multiSchedaPromptOpen}
        title="Più schede nel documento"
        subtitle="Acquisizione multi-schede"
        message={`Sono state lette più schede insieme (${formatCaptureMultiSchedaLabels(detectedSchedaTipos)}). Procederemo in sequenza: prima la scheda ingresso, poi le altre schede sulla stessa lavorazione.`}
        confirmLabel="Procedi"
        cancelLabel="Annulla acquisizione"
        layerClassName={cabModalZConfirm}
        onCancel={goBack}
        onConfirm={() => setMultiSchedaPromptOpen(false)}
      />
      <GestionaleConfirmDialog
        open={identMismatchConfirmOpen}
        title="Identificativi non corrispondenti"
        subtitle="Verifica prima di assegnare le schede"
        message={
          <>
            <p className="mb-2">
              Targa, matricola, cliente o n. scuderia non coincidono tra scheda ingresso e schede lavorazioni/ricambi
              lette dal file:
            </p>
            <ul className="list-disc space-y-1 pl-4 text-sm">
              {identMismatchWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="mt-2">Vuoi procedere comunque con l&apos;assegnazione automatica?</p>
          </>
        }
        confirmLabel="Procedi comunque"
        cancelLabel="Torna al form"
        layerClassName={cabModalZConfirm}
        onCancel={() => {
          setIdentMismatchConfirmOpen(false);
          setPendingHandoffLavorazioneId(null);
        }}
        onConfirm={handleIdentMismatchProceed}
      />
      <CaptureDuplicateDialog
        open={duplicateDialogOpen}
        duplicateCaptureId={pendingDuplicateOf}
        onCancel={handleDuplicateCancel}
        onOpenExisting={handleDuplicateOpenExisting}
        onAttach={handleDuplicateAttach}
        onForceNew={handleDuplicateForceNew}
      />
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
