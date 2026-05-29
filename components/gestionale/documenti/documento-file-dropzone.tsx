"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { UploadStatusInline } from "@/components/gestionale/upload";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import type { UploadFeedbackPhase } from "@/lib/upload/upload-feedback-types";
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
  const [dragOver, setDragOver] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const selectionPhase: UploadFeedbackPhase =
    uploadPhase && uploadPhase !== "idle" ? uploadPhase : pickedName ? "selected" : "idle";
  const dropzoneBusy = selectionPhase === "uploading" || disabled;

  const pick = useCallback(
    (file: File | null) => {
      if (disabled) return;
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

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0] ?? null;
    pick(file);
  }

  const inlineError = sizeError ?? uploadError;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">File</p>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !dropzoneBusy && fileRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all duration-200 ${
          dropzoneBusy ? "cursor-wait opacity-70" : "cursor-pointer"
        } ${
          selectionPhase === "uploading"
            ? "border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))]"
            : selectionPhase === "selected"
              ? "border-[color:color-mix(in_srgb,var(--cab-success)_40%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-success)_6%,var(--cab-surface))]"
              : dragOver
                ? "border-[color:var(--cab-primary)] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] shadow-[0_0_0_3px_color-mix(in_srgb,var(--cab-primary)_25%,transparent)]"
                : "border-zinc-500/70 bg-zinc-950/25 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))] dark:border-zinc-600"
        }`}
        aria-label="Area caricamento file"
        aria-busy={selectionPhase === "uploading"}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_18%,var(--cab-surface))] text-2xl" aria-hidden>
          📤
        </span>
        <div>
          <p className="text-sm font-semibold text-zinc-100">Trascina il file qui</p>
          <p className="mt-1 text-xs text-zinc-400">oppure</p>
        </div>
        <button
          type="button"
          className={`${erpBtnAccent} pointer-events-none min-h-11 px-5 text-sm`}
          tabIndex={-1}
          aria-hidden
        >
          Carica PDF o documento
        </button>
        <p className="text-[11px] text-zinc-500">
          PDF, Word, Excel, PNG, JPG · Max {MAX_MB} MB
        </p>
        {selectionPhase === "uploading" ? (
          <p className="text-xs font-medium text-[color:var(--cab-primary)]">Caricamento in corso…</p>
        ) : null}
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
        <p className="rounded-lg border border-zinc-700/50 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300">
          Pronto per il salvataggio: <span className="font-semibold text-zinc-100">{pickedName}</span>
          {pickedSizeKb > 0 ? <span className="text-zinc-500"> ({pickedSizeKb} KB)</span> : null}
        </p>
      ) : null}
    </div>
  );
}
