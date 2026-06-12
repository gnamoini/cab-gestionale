"use client";

import { LoadingFormSkeleton } from "@/components/design-system/loading";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import {
  HubIconDownload,
  HubIconOpen,
  HubIconReplace,
  HubIconTrash,
  HubIconUpload,
} from "@/components/design-system/hub-table-action-icons";

import { useCallback, useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { useUploadFeedback } from "@/context/upload-feedback-context";
import { UploadStatusInline, GestionaleUploadDropExpand } from "@/components/gestionale/upload";
import {
  isPdfFile,
  isValidPdfFile,
  LAVORAZIONE_DOCUMENT_SLOTS,
  lavorazioneDocumentByTipo,
} from "@/lib/lavorazioni/lavorazione-documents";
import { dsBtnDanger, dsBtnNeutral, dsHubModalFieldLabel, dsHubModalNestedCard, dsHubModalSectionTitle, dsTableActionTextBtn, dsTableActionTextBtnDanger, dsTableActionTextBtnPrimary } from "@/lib/ui/design-system";
import { cabSyncEventForEntity } from "@/lib/sync/gestionale-sync-dispatch";
import { invalidateEntity } from "@/lib/cache/minimal-invalidation-contract";
import { warmupDocumentPreview } from "@/lib/observability/asset-cache-warmup";
import { traceMutationLifecycle } from "@/lib/observability/trace-mutation-lifecycle";
import { reconcileGestionaleEntity } from "@/lib/sync/gestionale-reconcile";
import { lavorazioniDomainQueryKeys } from "@/src/services/domain/lavorazioni-domain.queries";
import { lavorazioneDocumentDeliveryUrl } from "@/lib/documents/document-delivery-url";
import { DocumentThumbnail } from "@/components/gestionale/documenti/document-thumbnail";
import { lavorazioneDocumentsService } from "@/src/services/lavorazione-documents.service";
import type { LavorazioneDocumentRow, LavorazioneDocumentTipo } from "@/src/types/supabase-tables";
import { useLavorazionePdfsByLavorazione } from "@/src/services/domain/lavorazioni-domain.queries";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";

function IconPdf() {
  return (
    <svg className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 12h8M8 15h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function DocumentSlotRow({
  label,
  uploadLabel,
  doc,
  canEdit,
  uploading,
  uploadError,
  flatInInfoCard,
  hideSlotLabel,
  hubCardLayout,
  onUpload,
  onRetryUpload,
  onRemove,
  onOpen,
  onDownload,
}: {
  label: string;
  uploadLabel: string;
  doc: LavorazioneDocumentRow | undefined;
  canEdit: boolean;
  uploading: boolean;
  uploadError?: string | null;
  flatInInfoCard?: boolean;
  hideSlotLabel?: boolean;
  hubCardLayout?: boolean;
  onUpload: (file: File) => void;
  onRetryUpload?: () => void;
  onRemove: () => void;
  onOpen: () => void;
  onDownload: () => void;
}) {
  const inputId = useId();
  const useHubBtns = hubCardLayout || flatInInfoCard;
  const btnNeutral = useHubBtns ? dsTableActionTextBtn : dsBtnNeutral;
  const btnPrimary = useHubBtns ? dsTableActionTextBtnPrimary : dsBtnNeutral;
  const btnDanger = useHubBtns ? dsTableActionTextBtnDanger : dsBtnDanger;
  const shellClass = flatInInfoCard && hideSlotLabel
    ? "min-w-0"
    : flatInInfoCard
      ? "border-b border-[color:var(--cab-border)] py-2.5 last:border-b-0"
      : `${dsHubModalNestedCard} flex flex-nowrap items-start justify-between gap-3 max-sm:flex-col sm:flex-wrap`;
  const labelClass = flatInInfoCard ? dsHubModalFieldLabel : dsHubModalSectionTitle;

  const uploadInput = (
    <input
      id={inputId}
      type="file"
      accept="application/pdf,.pdf"
      className="sr-only"
      disabled={uploading}
      onChange={(e) => {
        const file = e.currentTarget.files?.[0];
        e.currentTarget.value = "";
        if (file) onUpload(file);
      }}
    />
  );

  const actions = doc ? (
    <>
      <button type="button" className={btnNeutral} onClick={onOpen} title="Apri documento">
        <HubIconOpen />
        Apri
      </button>
      <button type="button" className={btnNeutral} onClick={onDownload} title="Scarica documento">
        <HubIconDownload />
        <span className="max-sm:sr-only">Scarica</span>
      </button>
      {canEdit ? (
        <>
          <label
            className={`${btnNeutral} ${uploading ? "cursor-wait opacity-60" : "cursor-pointer"}`}
            title={`Sostituisci ${label}`}
          >
            <HubIconReplace />
            <span className="max-sm:sr-only">Sostituisci</span>
            {uploadInput}
          </label>
          <button
            type="button"
            className={btnDanger}
            disabled={uploading}
            onClick={onRemove}
            title={`Elimina ${label}`}
            aria-label={`Elimina ${label}`}
          >
            <HubIconTrash />
            <span className="max-md:sr-only">Elimina</span>
          </button>
        </>
      ) : null}
    </>
  ) : canEdit ? (
    <label
      className={`${btnPrimary} ${uploading ? "cursor-wait opacity-60" : "cursor-pointer"}`}
      title={uploadLabel}
    >
      <HubIconUpload />
      Carica
      {uploadInput}
    </label>
  ) : null;

  const statusBlock = uploading || uploadError ? (
    <UploadStatusInline
      phase={uploading ? "uploading" : "error"}
      fileName={doc?.filename}
      error={uploadError}
      onRetry={onRetryUpload}
      compact
    />
  ) : null;

  const dropExpandProps = {
    accept: "application/pdf,.pdf",
    disabled: !canEdit || uploading,
    dropTitle: "Rilascia per caricare",
    dropHint: "Solo PDF",
    overlay: !!hubCardLayout,
    validateFile: (file: File) => (isPdfFile(file) ? null : "Seleziona un file PDF."),
    onFile: onUpload,
  };

  if (hubCardLayout) {
    const subtitle = doc ? (
      <span className="block truncate font-medium text-[color:var(--cab-text)]" title={doc.filename}>
        {doc.filename}
      </span>
    ) : (
      "Nessun documento caricato"
    );

    return (
      <GestionaleUploadDropExpand {...dropExpandProps}>
        <GestionaleInfoCard compact title={label} subtitle={subtitle} actions={actions}>
          {statusBlock}
        </GestionaleInfoCard>
      </GestionaleUploadDropExpand>
    );
  }

  return (
    <GestionaleUploadDropExpand {...dropExpandProps}>
    <div className={shellClass}>
      <div className="flex min-w-0 items-start justify-between gap-2.5">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {!flatInInfoCard ? (
            doc ? (
              <DocumentThumbnail
                documentId={doc.lavorazione_id}
                source="lavorazione"
                tipo={doc.tipo}
                hasPreview
                contentVersion={doc.uploaded_at}
                fallback={<IconPdf />}
                className="h-5 w-5 shrink-0 rounded object-cover"
              />
            ) : (
              <IconPdf />
            )
          ) : null}
          <div className="min-w-0">
            {hideSlotLabel ? null : <p className={labelClass}>{label}</p>}
            {doc ? (
              <p
                className={`${hideSlotLabel ? "truncate text-sm font-medium text-[color:var(--cab-text)]" : "mt-0.5 truncate text-[11px] text-[color:var(--cab-text-muted)]"}`}
                title={doc.filename}
              >
                {doc.filename}
              </p>
            ) : (
              <p className={`${hideSlotLabel ? "text-sm" : "mt-0.5 text-[11px]"} text-[color:var(--cab-text-muted)]`}>
                Nessun documento caricato
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        {doc ? (
          <>
            <button type="button" className={btnNeutral} onClick={onOpen}>
              Apri
            </button>
            <button type="button" className={btnNeutral} onClick={onDownload}>
              Scarica
            </button>
            {canEdit ? (
              <>
                <label
                  className={`${btnNeutral} ${uploading ? "cursor-wait opacity-60" : "cursor-pointer"}`}
                  title={`Sostituisci ${label}`}
                >
                  Sostituisci
                  <input
                    id={inputId}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0];
                      e.currentTarget.value = "";
                      if (file) onUpload(file);
                    }}
                  />
                </label>
                <button type="button" className={btnDanger} disabled={uploading} onClick={onRemove}>
                  Elimina
                </button>
              </>
            ) : null}
          </>
        ) : canEdit ? (
          <label
            className={`${btnPrimary} ${uploading ? "cursor-wait opacity-60" : "cursor-pointer"}`}
            title={uploadLabel}
          >
            {uploadLabel}
            <input
              id={inputId}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                if (file) onUpload(file);
              }}
            />
          </label>
        ) : null}
        </div>
      </div>
      {uploading || uploadError ? (
        <div className="mt-2 w-full">
          <UploadStatusInline
            phase={uploading ? "uploading" : "error"}
            fileName={doc?.filename}
            error={uploadError}
            onRetry={onRetryUpload}
            compact
          />
        </div>
      ) : null}
    </div>
    </GestionaleUploadDropExpand>
  );
}

export function LavorazioneDocumentsManager({
  lavorazioneId,
  canEdit = true,
  flatInInfoCard = false,
  hideSlotLabel = false,
  hubCardLayout = false,
  onlyTipo,
  onDocumentEvent,
}: {
  lavorazioneId: string;
  canEdit?: boolean;
  flatInInfoCard?: boolean;
  hideSlotLabel?: boolean;
  hubCardLayout?: boolean;
  onlyTipo?: LavorazioneDocumentTipo;
  onDocumentEvent?: () => void;
}) {
  const qc = useQueryClient();
  const gestToast = useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const { trackUpload } = useUploadFeedback();
  const docsQ = useLavorazionePdfsByLavorazione(lavorazioneId);
  const rows = docsQ.data ?? [];
  const [uploadingTipo, setUploadingTipo] = useState<LavorazioneDocumentTipo | null>(null);
  const [uploadErrorByTipo, setUploadErrorByTipo] = useState<Partial<Record<LavorazioneDocumentTipo, string>>>({});
  const [lastUploadFileByTipo, setLastUploadFileByTipo] = useState<Partial<Record<LavorazioneDocumentTipo, File>>>({});
  const syncDocuments = useCallback(
    (
      eventType: "entity_created" | "entity_updated" | "entity_deleted" = "entity_updated",
      dbVersion?: string,
    ) => {
      void traceMutationLifecycle(
        {
          entityType: "lavorazione",
          entityId: lavorazioneId,
          operation: `documents_${eventType}`,
          scope: "full",
        },
        () =>
          invalidateEntity({
            queryClient: qc,
            entityType: "lavorazione",
            entityId: lavorazioneId,
            scope: "full",
            cabSyncEvents: [
              cabSyncEventForEntity("lavorazione_documents", lavorazioneId, eventType, "lavorazione_documents"),
            ],
            dbVersion,
          }),
      );
      onDocumentEvent?.();
    },
    [qc, lavorazioneId, onDocumentEvent],
  );

  useCabSyncListener("lavorazione_documents", (event) => {
    const r = reconcileGestionaleEntity(qc, event, "cab_sync", { skipInvalidation: true });
    if (r.needsRefetch) {
      void qc.invalidateQueries({
        queryKey: lavorazioniDomainQueryKeys.lavorazionePdfs(lavorazioneId),
        refetchType: "active",
      });
    }
    onDocumentEvent?.();
  });

  async function handleUpload(tipo: LavorazioneDocumentTipo, file: File) {
    if (!(await isValidPdfFile(file))) {
      setUploadErrorByTipo((prev) => ({ ...prev, [tipo]: "Seleziona un file PDF valido." }));
      return;
    }
    const existing = lavorazioneDocumentByTipo(rows, tipo);
    if (existing) {
      const ok = await confirm({
        title: "Sostituire documento?",
        message: `«${existing.filename}» verrà sostituito con «${file.name}».`,
        confirmLabel: "Sostituisci",
      });
      if (!ok) return;
    }
    const slot = LAVORAZIONE_DOCUMENT_SLOTS.find((s) => s.tipo === tipo);
    setUploadingTipo(tipo);
    setUploadErrorByTipo((prev) => {
      const next = { ...prev };
      delete next[tipo];
      return next;
    });
    setLastUploadFileByTipo((prev) => ({ ...prev, [tipo]: file }));

    const result = await trackUpload({
      file,
      label: slot?.label ?? tipo,
      successToast: "Documento caricato.",
      showErrorToast: true,
      run: async () => {
        const res = await lavorazioneDocumentsService.upload(lavorazioneId, tipo, file);
        if (!res.success) throw new Error(res.error ?? "Upload non riuscito.");
        return res.data;
      },
      onSuccess: (row) => {
        syncDocuments("entity_created", row?.uploaded_at);
        warmupDocumentPreview(lavorazioneId, {
          source: "lavorazione",
          tipo,
          entityType: "lavorazione",
          entityId: lavorazioneId,
        });
        setUploadErrorByTipo((prev) => {
          const next = { ...prev };
          delete next[tipo];
          return next;
        });
      },
      onError: (message) => {
        setUploadErrorByTipo((prev) => ({ ...prev, [tipo]: message }));
      },
    });

    setUploadingTipo(null);
    if (!result.ok) {
      setUploadErrorByTipo((prev) => ({ ...prev, [tipo]: result.error }));
    }
  }

  function retryUpload(tipo: LavorazioneDocumentTipo) {
    const file = lastUploadFileByTipo[tipo];
    if (file) void handleUpload(tipo, file);
  }

  async function handleRemove(tipo: LavorazioneDocumentTipo) {
    const ok = await confirm({
      title: "Eliminare documento?",
      message: "Il file verrà rimosso dalla lavorazione.",
      destructive: true,
      confirmLabel: "Elimina",
    });
    if (!ok) return;
    setUploadingTipo(tipo);
    const res = await lavorazioneDocumentsService.remove(lavorazioneId, tipo);
    setUploadingTipo(null);
    if (!res.success) {
      gestToast.errorOnce("lav-doc-delete", res.error ?? "Eliminazione non riuscita.", { module: "lavorazioni" });
      return;
    }
    gestToast.successDeleted();
    syncDocuments("entity_deleted");
  }

  function openDoc(doc: LavorazioneDocumentRow) {
    window.open(lavorazioneDocumentDeliveryUrl(doc, "preview"), "_blank", "noopener,noreferrer");
  }

  function downloadDoc(doc: LavorazioneDocumentRow) {
    const a = document.createElement("a");
    a.href = lavorazioneDocumentDeliveryUrl(doc, "download");
    a.download = doc.filename;
    a.rel = "noopener";
    a.click();
  }

  const rowsContent = (
    <>
      {docsQ.isLoading ? <LoadingFormSkeleton fields={onlyTipo ? 1 : 2} className="py-1" /> : null}
      {LAVORAZIONE_DOCUMENT_SLOTS.filter((slot) => !onlyTipo || slot.tipo === onlyTipo).map((slot) => {
        const doc = lavorazioneDocumentByTipo(rows, slot.tipo);
        const busy = uploadingTipo === slot.tipo;
        return (
          <DocumentSlotRow
            key={slot.tipo}
            label={slot.label}
            uploadLabel={slot.uploadLabel}
            doc={doc}
            canEdit={canEdit}
            uploading={busy}
            uploadError={uploadErrorByTipo[slot.tipo]}
            flatInInfoCard={flatInInfoCard}
            hideSlotLabel={hideSlotLabel}
            hubCardLayout={hubCardLayout}
            onUpload={(file) => void handleUpload(slot.tipo, file)}
            onRetryUpload={() => retryUpload(slot.tipo)}
            onRemove={() => void handleRemove(slot.tipo)}
            onOpen={() => doc && void openDoc(doc)}
            onDownload={() => doc && void downloadDoc(doc)}
          />
        );
      })}
    </>
  );

  if (hubCardLayout) {
    return (
      <>
        {rowsContent}
        {confirmDialog}
      </>
    );
  }

  return (
    <section className={flatInInfoCard ? "min-w-0" : "space-y-2"}>
      {rowsContent}
      {confirmDialog}
    </section>
  );
}
