"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { LoadingButton } from "@/components/design-system";
import { GestionaleAiActionButton } from "@/components/design-system/gestionale-ai-action-button";
import { CaptureAnalyzeErrorPanel } from "@/components/document-capture/capture-analyze-error-panel";
import { CaptureAcquisitionProgress } from "@/components/document-capture/capture-acquisition-progress-panel";
import { DocumentUploadZone } from "@/components/document-capture/document-upload-zone";
import { CaptureReviewWarnings } from "@/components/document-capture/capture-review-warnings";
import { InventoryReceivingPendingBanner } from "@/components/gestionale/magazzino/carichi/inventory-receiving-pending-banner";
import { deriveInventoryReceivingAcquisition } from "@/lib/inventory-receiving/inventory-receiving-acquisition-progress";
import { ReceivingDocumentPreview } from "@/components/gestionale/magazzino/carichi/receiving-document-preview";
import { ReceivingReviewPanel } from "@/components/gestionale/magazzino/carichi/receiving-review-panel";
import { ReceivingReviewSplitLayout } from "@/components/gestionale/magazzino/carichi/receiving-review-split-layout";
import {
  INVENTORY_RECEIVING_STEP_COPY,
  InventoryReceivingStepIndicator,
} from "@/components/gestionale/magazzino/carichi/inventory-receiving-step-indicator";
import { useInventoryReceivingFlow } from "@/components/gestionale/magazzino/carichi/use-inventory-receiving-flow";
import { GestionaleModalShell, GestionaleModalScrollBody } from "@/components/gestionale/gestionale-modal";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import {
  abandonInventoryReceivingImport,
  fetchInventoryReceivingPreviewUrl,
} from "@/lib/inventory-receiving/inventory-receiving-import-client";
import { inventoryReceivingCaptureAdapter } from "@/lib/document-capture/inventory-receiving-capture-adapter";
import { useInventoryReceivingApply } from "@/lib/document-capture/use-inventory-receiving-apply";
import { usePermissions } from "@/src/hooks/use-permissions";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

type Props = {
  className?: string;
  size?: "sm" | "md";
  mobileIconOnly?: boolean;
};

function MagazzinoCarichiCaptureLauncherInner({ className = "", size = "sm", mobileIconOnly = false }: Props) {
  const router = useRouter();
  const gestToast = useGestionaleToast();
  const perm = usePermissions("magazzino_carichi");
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const flow = useInventoryReceivingFlow();

  const applyInput = useMemo(
    () =>
      flow.document?.id
        ? {
            documentId: flow.document.id,
            lines: flow.lines,
            lineDecisions: flow.lineDecisions,
            candidatesByLineId: flow.candidatesByLineId,
          }
        : null,
    [flow.candidatesByLineId, flow.document?.id, flow.lineDecisions, flow.lines],
  );

  const applyFlow = useInventoryReceivingApply(applyInput);

  const closeModal = useCallback(() => {
    const abandon = flow.pendingImportFileId;
    setOpen(false);
    flow.reset();
    setPreviewUrl(null);
    if (abandon) void abandonInventoryReceivingImport(abandon).catch(() => undefined);
  }, [flow]);

  const handleOpen = useCallback(() => {
    flow.reset();
    void flow.refreshPending();
    setOpen(true);
  }, [flow]);

  useEffect(() => {
    if (!open || !flow.document?.id) return;
    let cancelled = false;
    setPreviewLoading(true);
    void fetchInventoryReceivingPreviewUrl(flow.document.id)
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [flow.document?.id, open]);

  const acquisition = useMemo(
    () =>
      flow.step === "analyze"
        ? deriveInventoryReceivingAcquisition({
            uploadPhase:
              flow.upload.phase === "success"
                ? "idle"
                : flow.upload.phase === "error"
                  ? "error"
                  : flow.upload.phase,
            analyzeBusy: flow.analyzing,
            uploadError: flow.upload.error,
          })
        : null,
    [flow.analyzing, flow.step, flow.upload.error, flow.upload.phase],
  );

  const pipelineBusy =
    flow.step === "analyze" &&
    (flow.upload.phase === "uploading" || flow.upload.phase === "finalizing" || flow.analyzing);

  const stepCopy = INVENTORY_RECEIVING_STEP_COPY[flow.step];

  const onApply = useCallback(async () => {
    if (!perm.canWrite) return;
    flow.setError(null);
    const ok = await applyFlow.confirmAndApply();
    if (ok) {
      gestToast.success(inventoryReceivingCaptureAdapter.apply.successMessage);
      closeModal();
      router.refresh();
    } else if (applyFlow.error) {
      flow.setError(applyFlow.error);
      gestToast.error(applyFlow.error);
    }
  }, [applyFlow, closeModal, flow, gestToast, perm.canWrite, router]);

  if (!perm.canRead) return null;

  const confirmSubtitle =
    applyFlow.movementCount > 0
      ? `Creerà ${applyFlow.movementCount} moviment${applyFlow.movementCount === 1 ? "o" : "i"} a magazzino`
      : undefined;

  return (
    <>
      <GestionaleAiActionButton
        variant="primary"
        size={size}
        iconOnly={mobileIconOnly}
        className={className}
        disabled={!perm.canWrite}
        aria-label="Acquisizione DDT con AI"
        onClick={handleOpen}
      >
        <span className="hidden sm:inline">Carico DDT AI</span>
        {!mobileIconOnly ? <span className="sm:hidden">DDT AI</span> : null}
      </GestionaleAiActionButton>

      {open ? (
        <GestionaleModalShell
          modalSize="formLarge"
          title={stepCopy.title}
          subtitle={stepCopy.subtitle}
          titleId="magazzino-carichi-capture-title"
          onRequestClose={() => {
            if (pipelineBusy || applyFlow.busy) return;
            closeModal();
          }}
          onBack={
            flow.step === "review"
              ? () => {
                  closeModal();
                }
              : undefined
          }
          footer={
            flow.step === "review" && flow.document && perm.canWrite && flow.document.status !== "APPLIED" ? (
              <div className="flex min-w-0 w-full flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end">
                {confirmSubtitle ? (
                  <p className="text-xs text-[color:var(--cab-text-muted)] sm:mr-auto">{confirmSubtitle}</p>
                ) : null}
                <LoadingButton
                  type="button"
                  variant="primary"
                  className="min-h-11 sm:min-w-[10rem]"
                  loading={applyFlow.busy}
                  loadingLabel={inventoryReceivingCaptureAdapter.apply.confirmLoadingLabel}
                  onClick={() => void onApply()}
                >
                  {inventoryReceivingCaptureAdapter.apply.confirmLabel}
                </LoadingButton>
              </div>
            ) : undefined
          }
        >
          <GestionaleModalScrollBody className="min-h-0">
            <InventoryReceivingStepIndicator current={flow.step} />

            {flow.step === "hub" ? (
              <div className="space-y-4 pt-2">
                <InventoryReceivingPendingBanner
                  items={flow.pendingItems}
                  onResumeImportFile={(id) => void flow.resumePendingImport(id)}
                  onDismissImportFile={(id) => void abandonInventoryReceivingImport(id).then(() => flow.refreshPending())}
                />
                <CaptureAnalyzeErrorPanel
                  error={flow.error}
                  onRetry={flow.pendingImportFileId ? () => void flow.retryAnalyze() : undefined}
                />
                <DocumentUploadZone
                  config={inventoryReceivingCaptureAdapter.upload}
                  disabled={pipelineBusy || !perm.canWrite}
                  showHeading={false}
                  onFile={(file) => void flow.onFileSelected(file)}
                />
              </div>
            ) : null}

            {flow.step === "analyze" && acquisition ? (
              <div className="space-y-3">
                <CaptureAcquisitionProgress variant={{ mode: "checklist", state: acquisition }} />
                <CaptureAnalyzeErrorPanel
                  error={flow.error}
                  onRetry={flow.pendingImportFileId ? () => void flow.retryAnalyze() : undefined}
                />
              </div>
            ) : null}

            {flow.step === "review" && flow.document ? (
              <div className="min-h-0 pt-2">
                <CaptureReviewWarnings warnings={flow.warnings} />
                <ReceivingReviewSplitLayout
                  preview={<ReceivingDocumentPreview url={previewUrl} loading={previewLoading} />}
                  review={
                    <ReceivingReviewPanel
                      document={flow.document}
                      lines={flow.lines}
                      lineDecisions={flow.lineDecisions}
                      candidatesByLineId={flow.candidatesByLineId}
                      canWrite={perm.canWrite}
                      applying={applyFlow.busy}
                      error={flow.error ?? applyFlow.error}
                      onLineQtyChange={flow.updateLineQty}
                      onLineDecisionChange={flow.updateLineDecision}
                      onApply={() => void onApply()}
                      showApplyButton={false}
                    />
                  }
                />
              </div>
            ) : null}
          </GestionaleModalScrollBody>
        </GestionaleModalShell>
      ) : null}

      {flow.duplicateMessage ? (
        <GestionaleConfirmDialog
          open
          title="DDT già presente"
          confirmLabel="Continua comunque"
          cancelLabel="Annulla"
          onConfirm={() => void flow.confirmDuplicate()}
          onCancel={() => {
            const id = flow.pendingImportFileId;
            closeModal();
            if (id) void abandonInventoryReceivingImport(id).catch(() => undefined);
          }}
        >
          <div className="space-y-2 text-sm leading-relaxed text-[color:var(--cab-text-muted)]">
            <p>{flow.duplicateMessage}</p>
            {flow.duplicateDocumentId ? (
              <p>
                <Link
                  href={`/magazzino/carichi/nuovo?documentId=${flow.duplicateDocumentId}`}
                  className="underline"
                >
                  Apri documento esistente
                </Link>
              </p>
            ) : null}
          </div>
        </GestionaleConfirmDialog>
      ) : null}
    </>
  );
}

export const MagazzinoCarichiCaptureLauncher = dynamic(
  () => Promise.resolve({ default: MagazzinoCarichiCaptureLauncherInner }),
  { ssr: false },
);
