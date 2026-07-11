"use client";

import { HubIconUpload } from "@/components/design-system/hub-table-action-icons";
import { GestionaleUploadDropExpand } from "@/components/gestionale/upload";
import { DOCUMENT_CAPTURE_UPLOAD_ACCEPT, DOCUMENT_CAPTURE_UPLOAD_FORMAT_HINT } from "@/lib/document-capture/capture-upload-accept";
import { dsUploadDropExpand } from "@/lib/ui/design-system";

type Props = {
  enabled: boolean;
  disabled?: boolean;
  onFilePicked?: (file: File) => void;
};

export function LavorazioniCaptureDropOverlay({ enabled, disabled = false, onFilePicked }: Props) {
  if (!enabled) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">Carica documento</h3>
      <GestionaleUploadDropExpand
        overlay
        accept={DOCUMENT_CAPTURE_UPLOAD_ACCEPT}
        disabled={disabled}
        onFile={(file) => onFilePicked?.(file)}
        dropTitle="Rilascia per acquisire la scheda"
        dropHint="Word ed Excel verranno convertiti in PDF per la lettura AI"
        className="min-w-0"
      >
        <div
          className={`${dsUploadDropExpand} px-4 py-8 transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_38%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))] active:scale-[0.995] motion-reduce:transition-none motion-reduce:hover:transform-none`}
        >
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_16%,var(--cab-surface))] text-[color:var(--cab-primary)] shadow-[var(--cab-shadow-sm)]"
            aria-hidden
          >
            <HubIconUpload className="h-5 w-5 shrink-0" />
          </span>
          <p className="text-sm font-semibold text-[color:var(--cab-text)]">Scegli file dal computer</p>
          <p className="max-w-md text-xs leading-snug text-[color:var(--cab-text-muted)]">
            oppure trascina qui il documento della scheda compilata
          </p>
          <p className="text-[10px] uppercase tracking-wide text-[color:var(--cab-text-muted)]">
            {DOCUMENT_CAPTURE_UPLOAD_FORMAT_HINT}
          </p>
        </div>
      </GestionaleUploadDropExpand>
    </section>
  );
}
