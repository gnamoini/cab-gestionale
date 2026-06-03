"use client";

import { useCallback, useRef, useState } from "react";
import { UploadStatusInline } from "@/components/gestionale/upload";
import { HubIconUpload } from "@/components/design-system/hub-table-action-icons";
import { useFileDragZone } from "@/hooks/use-file-drag-zone";
import type { UploadFeedbackPhase } from "@/lib/upload/upload-feedback-types";
import { fileMatchesAccept } from "@/lib/upload/file-accept";
import { dsTableActionTextBtnPrimary, dsUploadDropExpand, dsUploadDropExpandActive } from "@/lib/ui/design-system";
import { STORAGE_LIMITS } from "@/src/lib/storage/storage-config";

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg";
const MAX_MB = Math.round(STORAGE_LIMITS.documentiMaxBytes / (1024 * 1024));

type DocumentoFileDropzoneProps = {
  pickedName: string;
  pickedSizeKb: number;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  uploadPhase?: UploadFeedbackPhase;
  uploadError?: string | null;
  onUploadRetry?: () => void;
};

export function DocumentoFileDropzone({
  pickedName,
  pickedSizeKb,
  onFileChange,
  disabled,
  uploadPhase,
  uploadError,
  onUploadRetry,
}: DocumentoFileDropzoneProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const selectionPhase: UploadFeedbackPhase =
    uploadPhase && uploadPhase !== "idle" ? uploadPhase : pickedName ? "selected" : "idle";
  const dropzoneBusy = selectionPhase === "uploading" || disabled;

  const pick = useCallback(
    (file: File | null) => {
      if (disabled) return;
      if (file && !fileMatchesAccept(file, ACCEPT)) {
        setSizeError("Tipo file non consentito. Usa PDF, Office o immagini JPG/PNG.");
        onFileChange(null);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      if (file && file.size > STORAGE_LIMITS.documentiMaxBytes) {
        setSizeError(`Il file supera il limite di ${MAX_MB} MB.`);
        onFileChange(null);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      setSizeError(null);
      onFileChange(file);
    },
    [disabled, onFileChange],
  );

  const { dragActive, dropZoneProps } = useFileDragZone({
    disabled: dropzoneBusy,
    onDropFile: (file) => pick(file),
  });

  const inlineError = sizeError ?? uploadError;

  const dropzoneClass =
    selectionPhase === "uploading"
      ? "border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))]"
      : selectionPhase === "selected"
        ? "border-[color:color-mix(in_srgb,var(--cab-success)_40%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-success)_6%,var(--cab-surface))]"
        : dragActive
          ? dsUploadDropExpandActive
          : "border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] hover:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))]";

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[color:var(--cab-text-muted)]">File</p>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        {...dropZoneProps}
        onClick={() => !dropzoneBusy && fileRef.current?.click()}
        className={`${dsUploadDropExpand} min-w-0 gap-3 ${dropzoneBusy ? "cursor-wait opacity-70" : "cursor-pointer"} ${dropzoneClass}`}
        aria-label="Area caricamento file"
        aria-busy={selectionPhase === "uploading"}
      >
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_18%,var(--cab-surface))] text-[color:var(--cab-primary)]"
          aria-hidden
        >
          <HubIconUpload className="h-6 w-6 shrink-0" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[color:var(--cab-text)]">Trascina il file qui</p>
          <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">oppure</p>
        </div>
        <span
          className={`${dsTableActionTextBtnPrimary} pointer-events-none min-h-11 px-5 text-sm`}
          aria-hidden
        >
          Carica PDF o documento
        </span>
        <p className="text-[11px] text-[color:var(--cab-text-muted)]">
          PDF, Word, Excel, PNG, JPG · Max {MAX_MB} MB
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        accept={ACCEPT}
        disabled={dropzoneBusy}
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <UploadStatusInline
        phase={selectionPhase}
        fileName={pickedName}
        error={inlineError}
        onRetry={onUploadRetry}
      />
      {pickedName && selectionPhase === "selected" ? (
        <p className="rounded-lg border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-3 py-2 text-xs text-[color:var(--cab-text-muted)]">
          Pronto per il salvataggio: <span className="font-semibold text-[color:var(--cab-text)]">{pickedName}</span>
          {pickedSizeKb > 0 ? <span className="text-[color:var(--cab-text-muted)]"> ({pickedSizeKb} KB)</span> : null}
        </p>
      ) : null}
    </div>
  );
}
