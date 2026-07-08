"use client";

import { useCallback, useState } from "react";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleUploadDropExpand } from "@/components/gestionale/upload";
import { LoadingProgressBar } from "@/components/design-system/loading";
import { analyzeOrdineFornitoreImport, finalizeOrdineFornitoreImportDocument } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-client";
import { registerImportPreventivoDocumento } from "@/lib/ordini-fornitori/import/register-import-preventivo-documento";
import type { OrdineFornitoreImportAnalyzeResult } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";
import { dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

type Phase = "idle" | "upload" | "analyze" | "duplicate" | "error";

type Props = {
  open: boolean;
  onClose: () => void;
  onComplete: (result: OrdineFornitoreImportAnalyzeResult) => void;
};

export function OrdineFornitoreImportModal({ open, onClose, onComplete }: Props) {
  const gestToast = useGestionaleToast();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingDocumentoId, setPendingDocumentoId] = useState<string | null>(null);
  const [pendingAnalyze, setPendingAnalyze] = useState<{
    result: OrdineFornitoreImportAnalyzeResult;
    duplicateMessage: string;
  } | null>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setPendingAnalyze(null);
    setPendingDocumentoId(null);
  }, []);

  const abandonPendingDocument = useCallback(async () => {
    if (!pendingDocumentoId) return;
    try {
      await finalizeOrdineFornitoreImportDocument({
        documentoId: pendingDocumentoId,
        action: "unlink",
      });
    } catch {
      /* best-effort cleanup */
    }
    setPendingDocumentoId(null);
  }, [pendingDocumentoId]);

  const closeModal = useCallback(() => {
    void abandonPendingDocument().finally(() => {
      reset();
      onClose();
    });
  }, [abandonPendingDocument, onClose, reset]);

  const runAnalyze = useCallback(
    async (documentoId: string) => {
      setPhase("analyze");
      setError(null);
      try {
        const result = await analyzeOrdineFornitoreImport({ documentoId });
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Analisi non riuscita.");
        setPhase("error");
        return null;
      }
    },
    [],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setPhase("upload");
      setError(null);
      try {
        const { documentoId } = await registerImportPreventivoDocumento(file);
        setPendingDocumentoId(documentoId);
        const preview = await runAnalyze(documentoId);
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
        setPendingDocumentoId(null);
        onComplete(preview);
        reset();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import non riuscito.");
        setPhase("error");
        gestToast.error(e);
      }
    },
    [gestToast, onClose, onComplete, reset, runAnalyze],
  );

  if (!open) return null;

  const busy = phase === "upload" || phase === "analyze";

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
          {phase === "idle" || phase === "error" ? (
            <GestionaleUploadDropExpand
              accept="application/pdf,image/jpeg,image/png,image/webp,image/*"
              disabled={busy}
              dropTitle="Trascina preventivo fornitore"
              dropHint="PDF, JPG, PNG — anche scansioni e multipagina"
              onFile={(file) => void handleFile(file)}
            >
              <div className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] p-6 text-center text-sm text-[color:var(--cab-muted-fg)]">
                Trascina il file qui o rilascialo sulla finestra
              </div>
            </GestionaleUploadDropExpand>
          ) : null}

          {phase === "upload" ? (
            <div className="space-y-2">
              <p className="text-sm text-[color:var(--cab-text)]">Caricamento documento…</p>
              <LoadingProgressBar />
            </div>
          ) : null}

          {phase === "analyze" ? (
            <div className="space-y-2">
              <p className="text-sm text-[color:var(--cab-text)]">Analisi AI e riconoscimento dati…</p>
              <LoadingProgressBar />
            </div>
          ) : null}

          {error ? <p className="text-sm text-[color:var(--cab-danger)]">{error}</p> : null}
        </div>
      </GestionaleModalShell>

      <GestionaleConfirmDialog
        open={phase === "duplicate" && pendingAnalyze !== null}
        title="Possibile duplicato"
        message={pendingAnalyze?.duplicateMessage ?? ""}
        confirmLabel="Procedi comunque"
        cancelLabel="Annulla"
        onConfirm={() => {
          if (!pendingAnalyze) return;
          setPendingDocumentoId(null);
          onComplete(pendingAnalyze.result);
          reset();
          onClose();
        }}
        onCancel={() => {
          closeModal();
        }}
      />
    </>
  );
}
