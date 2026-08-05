"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/gestionale/page-header";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { InventoryReceivingAcquisitionProgress } from "@/components/gestionale/magazzino/carichi/inventory-receiving-acquisition-progress";
import { deriveInventoryReceivingAcquisition } from "@/lib/inventory-receiving/inventory-receiving-acquisition-progress";
import { MagazzinoCarichiCaptureLauncher } from "@/components/gestionale/magazzino/carichi/magazzino-carichi-capture-launcher";
import { CaptureReviewWarnings } from "@/components/document-capture/capture-review-warnings";
import { CaptureAnalyzeErrorPanel } from "@/components/document-capture/capture-analyze-error-panel";
import { ReceivingDocumentPreview } from "@/components/gestionale/magazzino/carichi/receiving-document-preview";
import { ReceivingReviewPanel } from "@/components/gestionale/magazzino/carichi/receiving-review-panel";
import { ReceivingReviewSplitLayout } from "@/components/gestionale/magazzino/carichi/receiving-review-split-layout";
import {
  INVENTORY_RECEIVING_STEP_COPY,
  InventoryReceivingStepIndicator,
} from "@/components/gestionale/magazzino/carichi/inventory-receiving-step-indicator";
import { useInventoryReceivingFlow } from "@/components/gestionale/magazzino/carichi/use-inventory-receiving-flow";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import {
  abandonInventoryReceivingPending,
  fetchInventoryReceivingPreviewUrl,
} from "@/lib/inventory-receiving/inventory-receiving-import-client";
import { inventoryReceivingCaptureAdapter } from "@/lib/document-capture/inventory-receiving-capture-adapter";
import { useInventoryReceivingApply } from "@/lib/document-capture/use-inventory-receiving-apply";
import { dsStackPage } from "@/lib/ui/design-system";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { usePermissions } from "@/src/hooks/use-permissions";
import { useGestionaleSyncScope } from "@/src/hooks/gestionale/use-gestionale-sync-scope";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { invalidateAfterInventoryReceivingApply } from "@/src/lib/react-query/invalidate-related";

export function ReceivingWizard() {
  useGestionaleSyncScope({
    scopeId: "magazzino-carichi-wizard",
    domain: "magazzino",
    route: "/magazzino/carichi",
    tables: [
      "magazzino_ricambi",
      "movimenti_ricambi",
      "inventory_documents",
      "inventory_document_lines",
    ],
  });
  const router = useRouter();
  const queryClient = useQueryClient();
  const gestToast = useGestionaleToast();
  const searchParams = useSearchParams();
  const existingId = searchParams.get("documentId");
  const perm = usePermissions("magazzino_carichi");
  const flow = useInventoryReceivingFlow();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  useEffect(() => {
    if (existingId) void flow.loadDocument(existingId);
  }, [existingId, flow.loadDocument]);

  useEffect(() => {
    if (!flow.document?.id) return;
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
  }, [flow.document?.id]);

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

  const onApply = useCallback(async () => {
    if (!perm.canWrite) return;
    flow.setError(null);
    const ok = await applyFlow.confirmAndApply();
    if (ok) {
      gestToast.success(inventoryReceivingCaptureAdapter.apply.successMessage);
      invalidateAfterInventoryReceivingApply(queryClient);
      router.push("/magazzino/carichi");
      router.refresh();
    } else if (applyFlow.error) {
      flow.setError(applyFlow.error);
      gestToast.error(applyFlow.error);
    }
  }, [applyFlow, flow, gestToast, perm.canWrite, queryClient, router]);

  if (!existingId) {
    return (
      <GestionaleSectionGate module="magazzino_carichi">
        <div className={layoutPageRoot}>
          <PageHeader
            title="Riprendi carico DDT"
            description="Usa il pulsante Carico DDT AI dalla lista carichi per avviare una nuova acquisizione."
          />
          <div className={`${dsStackPage} space-y-4`}>
            <p className="text-sm text-[color:var(--cab-text-muted)]">
              <Link href="/magazzino/carichi" className="underline">
                ← Carichi
              </Link>
            </p>
            {perm.canWrite ? <MagazzinoCarichiCaptureLauncher size="md" className="h-11" /> : null}
          </div>
        </div>
      </GestionaleSectionGate>
    );
  }

  const stepCopy = INVENTORY_RECEIVING_STEP_COPY[flow.step];

  return (
    <GestionaleSectionGate module="magazzino_carichi">
      <div className={layoutPageRoot}>
        <PageHeader title={stepCopy.title} description={stepCopy.subtitle} />
        <div className={`${dsStackPage} flex min-h-0 flex-1 flex-col`}>
          <p className="text-sm text-[color:var(--cab-text-muted)]">
            <Link href="/magazzino/carichi" className="underline">
              ← Carichi
            </Link>
          </p>

          <InventoryReceivingStepIndicator current={flow.step} />

          {flow.step === "analyze" && acquisition ? (
            <div className="space-y-3">
              <InventoryReceivingAcquisitionProgress state={acquisition} />
              <CaptureAnalyzeErrorPanel
                error={flow.error}
                onRetry={flow.pendingImportFileId ? () => void flow.retryAnalyze() : undefined}
              />
            </div>
          ) : null}

          {flow.step === "review" && flow.document ? (
            <>
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
                  />
                }
              />
            </>
          ) : null}
        </div>
      </div>

      {flow.duplicateMessage ? (
        <GestionaleConfirmDialog
          open
          title="DDT già presente"
          message={flow.duplicateMessage}
          confirmLabel="Continua comunque"
          cancelLabel="Annulla"
          onConfirm={() => void flow.confirmDuplicate()}
          onCancel={() => {
            const id = flow.pendingImportFileId;
            flow.reset();
            if (id) {
              void abandonInventoryReceivingPending({ kind: "import_file", importFileId: id }).catch(() => undefined);
            }
          }}
        />
      ) : null}
    </GestionaleSectionGate>
  );
}
