"use client";

import type { UploadConfig } from "@/lib/document-capture/capture-experience-adapter";
import { lavorazioniCaptureAdapter } from "@/lib/document-capture/lavorazioni-capture-adapter";
import { DocumentUploadZone } from "@/components/document-capture/document-upload-zone";

type Props = {
  enabled: boolean;
  disabled?: boolean;
  config?: UploadConfig;
  onFilePicked?: (file: File) => void;
};

export function LavorazioniCaptureDropOverlay({
  enabled,
  disabled = false,
  config = lavorazioniCaptureAdapter.upload,
  onFilePicked,
}: Props) {
  if (!enabled) return null;
  return (
    <DocumentUploadZone
      config={config}
      disabled={disabled}
      onFile={(file) => onFilePicked?.(file)}
    />
  );
}
