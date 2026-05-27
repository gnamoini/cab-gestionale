"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/context/toast-context";
import { useUploadFeedback } from "@/context/upload-feedback-context";
import { UploadStatusInline } from "@/components/gestionale/upload";
import {
  isPdfFile,
  LAVORAZIONE_DOCUMENT_SLOTS,
  lavorazioneDocumentByTipo,
} from "@/lib/lavorazioni/lavorazione-documents";
import { dsBtnDanger, dsBtnNeutral } from "@/lib/ui/design-system";
import {
  cabSyncEventForEntity,
  dispatchGestionaleLocalMutation,
} from "@/lib/sync/gestionale-sync-dispatch";
import { reconcileGestionaleEntity } from "@/lib/sync/gestionale-reconcile";
import { lavorazioniDomainQueryKeys } from "@/src/services/domain/lavorazioni-domain.queries";
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
  onUpload: (file: File) => void;
  onRetryUpload?: () => void;
  onRemove: () => void;
  onOpen: () => void;
  onDownload: () => void;
}) {
  const inputId = useId();

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-zinc-100 bg-white/80 px-3 py-2.5 dark:border-zinc-700/80 dark:bg-zinc-900/50 max-sm:flex-col">
      <div className="flex min-w-0 items-start gap-2">
        <IconPdf />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">{label}</p>
          {doc ? (
            <p className="mt-0.5 truncate text-[11px] text-zinc-500" title={doc.filename}>
              {doc.filename}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-zinc-500">Nessun documento caricato</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {doc ? (
          <>
            <button type="button" className={dsBtnNeutral} onClick={onOpen}>
              Apri
            </button>
            <button type="button" className={dsBtnNeutral} onClick={onDownload}>
              Scarica
            </button>
            {canEdit ? (
              <>
                <label
                  className={`${dsBtnNeutral} ${uploading ? "cursor-wait opacity-60" : "cursor-pointer"}`}
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
                <button type="button" className={dsBtnDanger} disabled={uploading} onClick={onRemove}>
                  Elimina
                </button>
              </>
            ) : null}
          </>
        ) : canEdit ? (
          <label
            className={`${dsBtnNeutral} ${uploading ? "cursor-wait opacity-60" : "cursor-pointer"}`}
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
      {uploading || uploadError ? (
        <div className="mt-2 w-full basis-full">
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
  );
}

export function LavorazioneDocumentsManager({
  lavorazioneId,
  canEdit = true,
  onDocumentEvent,
}: {
  lavorazioneId: string;
  canEdit?: boolean;
  onDocumentEvent?: () => void;
}) {
  const qc = useQueryClient();
  const { push: pushToast } = useToast();
  const { trackUpload } = useUploadFeedback();
  const docsQ = useLavorazionePdfsByLavorazione(lavorazioneId);
  const rows = docsQ.data ?? [];
  const [uploadingTipo, setUploadingTipo] = useState<LavorazioneDocumentTipo | null>(null);
  const [uploadErrorByTipo, setUploadErrorByTipo] = useState<Partial<Record<LavorazioneDocumentTipo, string>>>({});
  const [lastUploadFileByTipo, setLastUploadFileByTipo] = useState<Partial<Record<LavorazioneDocumentTipo, File>>>({});
  const [urlCache, setUrlCache] = useState<Record<string, string>>({});

  const syncDocuments = useCallback(
    (eventType: "entity_created" | "entity_updated" | "entity_deleted" = "entity_updated") => {
      dispatchGestionaleLocalMutation(qc, ["lavorazione_documents"], [
        cabSyncEventForEntity("lavorazione_documents", lavorazioneId, eventType, "lavorazione_documents"),
      ]);
      onDocumentEvent?.();
    },
    [qc, lavorazioneId, onDocumentEvent],
  );

  useCabSyncListener("lavorazione_documents", (event) => {
    setUrlCache({});
    const r = reconcileGestionaleEntity(qc, event, "cab_sync", { skipInvalidation: true });
    if (r.needsRefetch) {
      void qc.invalidateQueries({
        queryKey: lavorazioniDomainQueryKeys.lavorazionePdfs(lavorazioneId),
        refetchType: "active",
      });
    }
    onDocumentEvent?.();
  });

  const resolveUrl = useCallback(
    async (doc: LavorazioneDocumentRow): Promise<string | null> => {
      const cached = urlCache[doc.storage_path];
      if (cached) return cached;
      const res = await lavorazioneDocumentsService.listWithUrls(lavorazioneId);
      if (!res.success) return null;
      const hit = (res.data ?? []).find((r) => r.tipo === doc.tipo);
      if (!hit?.signedUrl) return null;
      setUrlCache((prev) => ({ ...prev, [doc.storage_path]: hit.signedUrl }));
      return hit.signedUrl;
    },
    [lavorazioneId, urlCache],
  );

  useEffect(() => {
    if (!docsQ.isSuccess || rows.length === 0) return;
    let cancelled = false;
    void (async () => {
      const res = await lavorazioneDocumentsService.listWithUrls(lavorazioneId);
      if (!res.success || cancelled) return;
      const next: Record<string, string> = {};
      for (const r of res.data ?? []) next[r.storage_path] = r.signedUrl;
      if (!cancelled) setUrlCache(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [docsQ.isSuccess, lavorazioneId, rows.length]);

  async function handleUpload(tipo: LavorazioneDocumentTipo, file: File) {
    if (!isPdfFile(file)) {
      setUploadErrorByTipo((prev) => ({ ...prev, [tipo]: "Seleziona un file PDF." }));
      return;
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
      onSuccess: () => {
        syncDocuments("entity_created");
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
    if (!window.confirm("Eliminare questo documento?")) return;
    setUploadingTipo(tipo);
    const res = await lavorazioneDocumentsService.remove(lavorazioneId, tipo);
    setUploadingTipo(null);
    if (!res.success) {
      pushToast(res.error ?? "Eliminazione non riuscita.", "error");
      return;
    }
    pushToast("Documento eliminato.", "success");
    syncDocuments("entity_deleted");
  }

  async function openDoc(doc: LavorazioneDocumentRow) {
    const url = urlCache[doc.storage_path] ?? (await resolveUrl(doc));
    if (!url) {
      pushToast("Impossibile aprire il documento.", "error");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function downloadDoc(doc: LavorazioneDocumentRow) {
    const url = urlCache[doc.storage_path] ?? (await resolveUrl(doc));
    if (!url) {
      pushToast("Impossibile scaricare il documento.", "error");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.filename;
    a.rel = "noopener";
    a.click();
  }

  return (
    <section className="space-y-2">
      {docsQ.isLoading ? <p className="text-xs text-zinc-500">Caricamento documenti…</p> : null}
      {LAVORAZIONE_DOCUMENT_SLOTS.map((slot) => {
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
            onUpload={(file) => void handleUpload(slot.tipo, file)}
            onRetryUpload={() => retryUpload(slot.tipo)}
            onRemove={() => void handleRemove(slot.tipo)}
            onOpen={() => doc && void openDoc(doc)}
            onDownload={() => doc && void downloadDoc(doc)}
          />
        );
      })}
    </section>
  );
}
