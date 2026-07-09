"use client";

import { useCallback, useRef, useState } from "react";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleUploadDropExpand } from "@/components/gestionale/upload";
import { LoadingProgressBar } from "@/components/design-system/loading";
import { useImportFileUpload } from "@/lib/import-files/use-import-file-upload";
import {
  abandonImportFile,
  analyzeOrdineFornitoreImport,
} from "@/lib/ordini-fornitori/import/ordine-fornitore-import-client";
import type { OrdineFornitoreImportAnalyzeResult } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";
import { dsBtnNeutral } from "@/lib/ui/design-system";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

type Phase = "idle" | "upload" | "analyze" | "duplicate" | "error";

type Props = {
  open: boolean;
  onClose: () => void;
  onComplete: (result: OrdineFornitoreImportAnalyzeResult) => void;
};

export function OrdineFornitoreImportModal({ open, onClose, onComplete }: Props) {
  const gestToast = useGestionaleToast();
  const importUpload = useImportFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingImportFileId, setPendingImportFileId] = useState<string | null>(null);
  const [pendingAnalyze, setPendingAnalyze] = useState<{
    result: OrdineFornitoreImportAnalyzeResult;
    duplicateMessage: string;
  } | null>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setPendingAnalyze(null);
    setPendingImportFileId(null);
    importUpload.reset();
  }, [importUpload]);

  const abandonPendingImport = useCallback(async () => {
    if (!pendingImportFileId) return;
    try {
      await abandonImportFile(pendingImportFileId);
    } catch {
      /* best-effort cleanup */
    }
    setPendingImportFileId(null);
  }, [pendingImportFileId]);

  const closeModal = useCallback(() => {
    void abandonPendingImport().finally(() => {
      reset();
      onClose();
    });
  }, [abandonPendingImport, onClose, reset]);

  const runAnalyze = useCallback(async (importFileId: string) => {
    setPhase("analyze");
    setError(null);
    try {
      return await analyzeOrdineFornitoreImport({
        source: { type: "import_file", id: importFileId },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analisi non riuscita.");
      setPhase("error");
      return null;
    }
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setPhase("upload");
      setError(null);
      try {
        const uploaded = await importUpload.upload({ file, kind: "ordine_fornitore" });
        if (!uploaded?.fileId) {
          setError(importUpload.error ?? "Upload non riuscito.");
          setPhase("error");
          return;
        }
        setPendingImportFileId(uploaded.fileId);
        const preview = await runAnalyze(uploaded.fileId);
        if (!preview) return;

        const dupParts: string[] = [];
        if (preview.duplicates.hashDuplicate) {
          dupParts.push(
            `File già importato (ordine ${preview.duplicates.hashDuplicate.ordineNumero ?? preview.duplicates.hashDuplicate.ordineId}).`,
          );
        }
        if (preview.duplicates.semanticDuplicate) {
          dupParts.push(
            `Preventivo simile già presente (ordine ${preview.duplicates.semanticDuplicate.ordineNumero ?? preview.duplicates.semanticDuplicate.ordineId}).`,
          );
        }
        if (dupParts.length) {
          setPendingAnalyze({ result: preview, duplicateMessage: dupParts.join(" ") });
          setPhase("duplicate");
          return;
        }
        setPendingImportFileId(null);
        onComplete(preview);
        reset();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import non riuscito.");
        setPhase("error");
        gestToast.error(e);
      }
    },
    [gestToast, importUpload, onClose, onComplete, reset, runAnalyze],
  );

  if (!open) return null;

  const busy =
    phase === "upload" ||
    phase === "analyze" ||
    importUpload.phase === "uploading" ||
    importUpload.phase === "finalizing";

  return (
    <>
      <GestionaleModalShell
        modalSize="formMedium"
        title="Importa da preventivo"
        onRequestClose={() => {
          if (busy) return;
          closeModal();
        }}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={dsBtnNeutral} disabled={busy} onClick={() => closeModal()}>
              Chiudi
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {busy ? (
            <LoadingProgressBar label={phase === "analyze" ? "Analisi IA in corso…" : "Caricamento file…"} />
          ) : phase === "error" ? (
            <p className="text-sm text-destructive">{error ?? importUpload.error}</p>
          ) : (
            <GestionaleUploadDropExpand
              accept="application/pdf,image/jpeg,image/png,image/webp,image/*"
              disabled={busy}
              dropTitle="Trascina preventivo fornitore"
              dropHint="PDF o immagine — il file resta temporaneo e non entra in Documenti"
              onFile={handleFile}
            >
              <div className="flex flex-col items-center gap-2 py-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className={dsBtnNeutral}
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Scegli file
                </button>
              </div>
            </GestionaleUploadDropExpand>
          )}
        </div>
      </GestionaleModalShell>

      {pendingAnalyze ? (
        <GestionaleConfirmDialog
          open
          title="Import duplicato"
          message={pendingAnalyze.duplicateMessage}
          confirmLabel="Continua comunque"
          cancelLabel="Annulla"
          onConfirm={() => {
            setPendingImportFileId(null);
            onComplete(pendingAnalyze.result);
            reset();
            onClose();
          }}
          onCancel={() => {
            void abandonPendingImport().finally(() => {
              reset();
              onClose();
            });
          }}
        />
      ) : null}
    </>
  );
}
