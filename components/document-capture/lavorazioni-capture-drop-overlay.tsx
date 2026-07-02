"use client";

import { useCallback, useState } from "react";
import { GestionaleUploadDropExpand } from "@/components/gestionale/upload";
import { DocumentCaptureUploadProgress } from "@/components/document-capture/document-capture-upload-progress";
import { useDocumentCaptureUpload } from "@/lib/document-capture/use-document-capture-upload";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";

type Props = {
  enabled: boolean;
  lavorazioneId?: string;
  onUploaded?: (captureId: string) => void;
};

export function LavorazioniCaptureDropOverlay({ enabled, lavorazioneId, onUploaded }: Props) {
  const { phase, error, progress, upload, reset } = useDocumentCaptureUpload();
  const gestToast = useGestionaleToast();
  const [open, setOpen] = useState(false);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || !enabled) return;
      setOpen(true);
      const result = await upload({ file, lavorazioneId });
      if (!result) {
        gestToast.error(GESTIONALE_TOAST.genericError);
        return;
      }
      if (result.duplicateOf) {
        gestToast.info("Documento già presente in archivio (duplicato).");
      } else {
        gestToast.success("Documento acquisito.");
      }
      onUploaded?.(result.captureId);
    },
    [enabled, gestToast, lavorazioneId, onUploaded, upload],
  );

  if (!enabled) return null;

  return (
    <div className="space-y-2">
      <GestionaleUploadDropExpand
        accept="application/pdf,image/*"
        disabled={phase === "uploading" || phase === "finalizing"}
        onFile={(file) => void handleFiles([file])}
        dropTitle="Trascina scheda o PDF per acquisizione digitale"
      >
        <div className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] p-4 text-center text-sm text-[color:var(--cab-muted-fg)]">
          Trascina qui oppure usa il drag sulla pagina
        </div>
      </GestionaleUploadDropExpand>
      {open ? (
        <DocumentCaptureUploadProgress phase={phase} progress={progress} error={error} />
      ) : null}
      {(phase === "success" || phase === "duplicate" || phase === "error") && (
        <button type="button" className="text-xs underline" onClick={() => { reset(); setOpen(false); }}>
          Chiudi
        </button>
      )}
    </div>
  );
}
