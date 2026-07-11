"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { LoadingSpinner } from "@/components/design-system/loading";
import {
  GestionaleAiActionButton,
  type GestionaleAiActionButtonSize,
} from "@/components/design-system/gestionale-ai-action-button";
import type { CaptureFieldReviewGridHandle } from "@/components/document-capture/capture-field-review-grid";
import { CaptureIngressoMissingDialog } from "@/components/document-capture/capture-ingresso-missing-dialog";
import {
  CaptureEntityAmbiguityDialog,
  type AmbiguityPick,
} from "@/components/document-capture/capture-entity-ambiguity-dialog";
import { CaptureLavorazioneAssignConfirmDialog } from "@/components/document-capture/capture-lavorazione-assign-confirm-dialog";
import { CaptureUnsavedChangesDialog } from "@/components/document-capture/capture-unsaved-changes-dialog";
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
  fetchCaptureIngressoFields,
  inferCaptureSchedaTipo,
  mapCaptureFieldsToIngresso,
  type CaptureFieldRow,
} from "@/lib/document-capture/capture-field-mapper";
import {
  describeCaptureLavorazioneAssignTarget,
  findActiveLavorazioneWithIngressoForCaptureIdent,
  resolveCaptureIdentFromFields,
  type CaptureIdent,
} from "@/lib/document-capture/capture-lavorazione-match";
import { LavorazioniCaptureDropOverlay } from "@/components/document-capture/lavorazioni-capture-drop-overlay";
import { GestionaleModalShell, GestionaleModalScrollBody } from "@/components/gestionale/gestionale-modal";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import { useMagazzinoRicambiUIQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import type { CaptureCatalogValidationInput } from "@/lib/document-capture/capture-catalog-validation";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaIngressoFields, SchedaTipo } from "@/types/schede";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";

const LavorazioneCreateModal = dynamic(
  () =>
    import("@/components/gestionale/lavorazioni/lavorazione-create-modal").then((m) => ({
      default: m.LavorazioneCreateModal,
    })),
  { ssr: false },
);

export type CaptureSchedeOpenRequest = {
  lavorazioneId: string;
  schedaTipo: Extract<SchedaTipo, "lavorazioni" | "ricambi">;
  fieldRows: CaptureFieldRow[];
};

type PendingAssign = {
  lavorazioneId: string;
  schedaTipo: Extract<SchedaTipo, "lavorazioni" | "ricambi">;
  fieldRows: CaptureFieldRow[];
  ident: CaptureIdent;
  targetLabel: string;
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
  const [createFields, setCreateFields] = useState<SchedaIngressoFields | null>(null);
  const [prepareCreateBusy, setPrepareCreateBusy] = useState(false);
  const [prepareCreateError, setPrepareCreateError] = useState<string | null>(null);
  const [ingressoMissingOpen, setIngressoMissingOpen] = useState(false);
  const [missingIdent, setMissingIdent] = useState<CaptureIdent | null>(null);
  const [pendingSchedaTipo, setPendingSchedaTipo] = useState<Extract<SchedaTipo, "lavorazioni" | "ricambi"> | null>(
    null,
  );
  const [pendingFieldRows, setPendingFieldRows] = useState<CaptureFieldRow[] | null>(null);
  const [assignConfirmOpen, setAssignConfirmOpen] = useState(false);
  const [ambiguityOpen, setAmbiguityOpen] = useState(false);
  const [ambiguityItems, setAmbiguityItems] = useState<
    Array<{ fieldKey: string; original: string; resolution: import("@/lib/entity-resolution/entity-resolution-types").EntityResolutionResult }>
  >([]);
  const [ambiguityBusy, setAmbiguityBusy] = useState(false);
  const [unsavedChangesOpen, setUnsavedChangesOpen] = useState(false);
  const [unsavedChangesBusy, setUnsavedChangesBusy] = useState(false);
  const [pendingAssign, setPendingAssign] = useState<PendingAssign | null>(null);
  const [schedeHandoffBusy, setSchedeHandoffBusy] = useState(false);
  const analyzeTriggeredRef = useRef<string | null>(null);
  const reviewSaveRef = useRef<CaptureFieldReviewGridHandle | null>(null);
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

  const catalogValidation = useMemo((): CaptureCatalogValidationInput | null => {
    if (!sharedGlobalOpts || sharedGlobalOpts.isLoading) return null;
    return {
      fields: [],
      addettiRecords: sharedGlobalOpts.lavorazioni.addettiRecords,
      mezziListe: sharedGlobalOpts.mezziListe,
      magazzino: magazzinoQuery.data ?? [],
    };
  }, [magazzinoQuery.data, sharedGlobalOpts]);

  const resetFlow = useCallback(() => {
    setStep("hub");
    setCaptureId(null);
    setCreateFields(null);
    setPrepareCreateError(null);
    setIngressoMissingOpen(false);
    setMissingIdent(null);
    setPendingSchedaTipo(null);
    setPendingFieldRows(null);
    setAssignConfirmOpen(false);
    setPendingAssign(null);
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

  const handleCreateModalClose = useCallback(() => {
    setCreateFields(null);
    if (pendingSchedaTipo && pendingFieldRows) return;
    setStep("review");
  }, [pendingFieldRows, pendingSchedaTipo]);

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

  const runCapturePipeline = useCallback(
    async (file: File) => {
      setStep("analyze");
      setCaptureId(null);
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
      if (ok) setStep("review");
    },
    [gestToast, resetWizardApi, runAnalyze, upload],
  );

  const retryAnalyze = useCallback(async () => {
    if (!captureId || wizardBusy) return;
    const ok = await runAnalyze(captureId);
    if (ok) setStep("review");
  }, [captureId, runAnalyze, wizardBusy]);

  const handleFilePicked = useCallback(
    (file: File) => {
      void runCapturePipeline(file);
    },
    [runCapturePipeline],
  );

  const goBack = useCallback(() => {
    if (step === "analyze" || step === "review") {
      discardCurrentCapture();
      resetFlow();
      return;
    }
    if (step === "confirm") {
      handleCreateModalClose();
    }
  }, [discardCurrentCapture, handleCreateModalClose, resetFlow, step]);

  const continueAfterReview = useCallback(async () => {
    if (!captureId) return;
    setPrepareCreateBusy(true);
    setPrepareCreateError(null);
    try {
      const ambiguous = reviewSaveRef.current?.getAmbiguousItems() ?? [];
      if (ambiguous.length > 0) {
        setAmbiguityItems(ambiguous);
        setAmbiguityOpen(true);
        return;
      }

      const fieldRows = await fetchCaptureFieldRows(captureId);
      const schedaTipo = inferCaptureSchedaTipo(fieldRows) ?? "ingresso";

      if (schedaTipo === "ingresso") {
        setCreateFields(mapCaptureFieldsToIngresso(fieldRows));
        setPendingSchedaTipo(null);
        setPendingFieldRows(null);
        setStep("confirm");
        return;
      }

      const ident = resolveCaptureIdentFromFields(fieldRows);
      const match = findActiveLavorazioneWithIngressoForCaptureIdent(ident, mezzi, schedeStore, attive);
      if (!match) {
        setMissingIdent(ident);
        setPendingSchedaTipo(schedaTipo);
        setPendingFieldRows(fieldRows);
        setIngressoMissingOpen(true);
        return;
      }

      setPendingAssign({
        lavorazioneId: match.lavorazioneId,
        schedaTipo,
        fieldRows,
        ident,
        targetLabel: describeCaptureLavorazioneAssignTarget(match.lavorazioneId, attive, schedeStore),
      });
      setAssignConfirmOpen(true);
    } catch (e) {
      setPrepareCreateError(e instanceof Error ? e.message : "Impossibile preparare la lavorazione");
    } finally {
      setPrepareCreateBusy(false);
    }
  }, [attive, captureId, mezzi, schedeStore]);

  const proceedAfterReview = useCallback(async () => {
    if (!captureId) return;
    if (reviewSaveRef.current?.hasUnsavedChanges()) {
      setUnsavedChangesOpen(true);
      return;
    }
    await continueAfterReview();
  }, [captureId, continueAfterReview]);

  const goToCreate = useCallback(async () => {
    await proceedAfterReview();
  }, [proceedAfterReview]);

  const handleSaveAndContinueReview = useCallback(async () => {
    setUnsavedChangesBusy(true);
    try {
      const saved = (await reviewSaveRef.current?.saveConfirmed()) ?? false;
      if (!saved) throw new Error("Salvataggio non riuscito");
      setUnsavedChangesOpen(false);
      await continueAfterReview();
    } catch (e) {
      setPrepareCreateError(e instanceof Error ? e.message : "Salvataggio non riuscito");
    } finally {
      setUnsavedChangesBusy(false);
    }
  }, [continueAfterReview]);

  const handleContinueWithoutSavingReview = useCallback(async () => {
    setUnsavedChangesOpen(false);
    await continueAfterReview();
  }, [continueAfterReview]);

  const confirmAmbiguityPicks = useCallback(
    async (picks: AmbiguityPick[]) => {
      if (!captureId) return;
      setAmbiguityBusy(true);
      try {
        const payload = picks.map((p) => ({
          fieldKey: p.fieldKey,
          label: p.label === "__keep__" ? p.original : p.label,
          id: p.id,
          original: p.original,
        }));
        const res = await fetch(`/api/document-capture/${captureId}/entity-resolution`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ picks: payload }),
        });
        if (!res.ok) throw new Error("Conferma riconciliazione non riuscita");
        setAmbiguityOpen(false);
        setAmbiguityItems([]);
        await proceedAfterReview();
      } catch (e) {
        setPrepareCreateError(e instanceof Error ? e.message : "Conferma non riuscita");
      } finally {
        setAmbiguityBusy(false);
      }
    },
    [captureId, proceedAfterReview],
  );

  const confirmAssignToLavorazione = useCallback(async () => {
    if (!pendingAssign) return;
    setAssignConfirmOpen(false);
    const request: CaptureSchedeOpenRequest = {
      lavorazioneId: pendingAssign.lavorazioneId,
      schedaTipo: pendingAssign.schedaTipo,
      fieldRows: pendingAssign.fieldRows,
    };
    setPendingAssign(null);
    await openSchedeEditor(request, { handoff: true });
  }, [openSchedeEditor, pendingAssign]);

  const startIngressoCreateForPendingScheda = useCallback(async () => {
    if (!pendingFieldRows || !pendingSchedaTipo) return;
    setIngressoMissingOpen(false);
    try {
      const ingresso = mapCaptureFieldsToIngresso(pendingFieldRows);
      setCreateFields(ingresso);
      setStep("confirm");
    } catch (e) {
      setPrepareCreateError(e instanceof Error ? e.message : "Impossibile preparare la scheda ingresso");
    }
  }, [pendingFieldRows, pendingSchedaTipo]);

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
  const footerBusy = wizardBusy || prepareCreateBusy || pipelineBusy;
  const reviewCta = "Prosegui";

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
      {open && step !== "confirm" ? (
        <GestionaleModalShell
          modalSize="formLarge"
          onRequestClose={handleClose}
          onBack={step !== "hub" ? goBack : undefined}
          title={stepCopy.title}
          subtitle={stepCopy.subtitle}
          titleId="lav-digital-capture-title"
          footer={
            step === "review" && !prepareCreateBusy ? (
              <div className="flex min-w-0 w-full justify-end gap-2">
                <LoadingButton
                  type="button"
                  variant="primary"
                  loading={footerBusy}
                  onClick={() => void goToCreate()}
                >
                  {reviewCta}
                </LoadingButton>
              </div>
            ) : undefined
          }
        >
          <GestionaleModalScrollBody className="space-y-5">
            <DocumentCaptureStepIndicator current={step} />
            {step === "hub" ? (
              <LavorazioniCaptureDropOverlay enabled onFilePicked={handleFilePicked} />
            ) : null}
            {step !== "hub" ? (
              <DocumentCaptureWizardBody
                captureId={captureId}
                step={step}
                acquisition={acquisition}
                error={error ?? prepareCreateError}
                onRetryAnalyze={() => void retryAnalyze()}
                reviewSaveRef={reviewSaveRef}
                catalogValidation={catalogValidation}
                sharedGlobalOpts={sharedGlobalOpts}
                magazzino={magazzinoQuery.data ?? []}
                mezzi={mezzi}
              />
            ) : null}
          </GestionaleModalScrollBody>
        </GestionaleModalShell>
      ) : null}
      {pendingAssign ? (
        <CaptureLavorazioneAssignConfirmDialog
          open={assignConfirmOpen}
          schedaLabel={pendingAssign.schedaTipo === "ricambi" ? "scheda ricambi" : "scheda lavorazioni"}
          targetLabel={pendingAssign.targetLabel}
          captureIdent={pendingAssign.ident}
          onCancel={() => {
            setAssignConfirmOpen(false);
            setPendingAssign(null);
          }}
          onConfirm={() => void confirmAssignToLavorazione()}
        />
      ) : null}
      {missingIdent && pendingSchedaTipo ? (
        <CaptureIngressoMissingDialog
          open={ingressoMissingOpen}
          schedaLabel={pendingSchedaTipo === "ricambi" ? "scheda ricambi" : "scheda lavorazioni"}
          ident={missingIdent}
          onCancel={() => {
            setIngressoMissingOpen(false);
            setMissingIdent(null);
            setPendingSchedaTipo(null);
            setPendingFieldRows(null);
          }}
          onCreateIngresso={() => void startIngressoCreateForPendingScheda()}
        />
      ) : null}
      <CaptureEntityAmbiguityDialog
        open={ambiguityOpen}
        items={ambiguityItems}
        pending={ambiguityBusy}
        onCancel={() => {
          setAmbiguityOpen(false);
          setAmbiguityItems([]);
        }}
        onConfirm={(picks) => void confirmAmbiguityPicks(picks)}
      />
      <CaptureUnsavedChangesDialog
        open={unsavedChangesOpen}
        pending={unsavedChangesBusy}
        onCancel={() => setUnsavedChangesOpen(false)}
        onSaveAndContinue={() => void handleSaveAndContinueReview()}
        onContinueWithoutSave={() => void handleContinueWithoutSavingReview()}
      />
      {open && step === "confirm" && createFields ? (
        <LavorazioneCreateModal
          open
          initialFields={createFields}
          createdBy={createdBy}
          mezzi={mezzi}
          schedeStore={schedeStore}
          attive={attive}
          storico={storico}
          sharedGlobalOpts={sharedGlobalOpts}
          sharedMezziCatalog={sharedMezziCatalog}
          onClose={handleCreateModalClose}
          onCreated={(id) => {
            void (async () => {
              if (pendingSchedaTipo && pendingFieldRows) {
                const opened = await openSchedeEditor(
                  {
                    lavorazioneId: id,
                    schedaTipo: pendingSchedaTipo,
                    fieldRows: pendingFieldRows,
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
          }}
        />
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
