"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg";

type DocumentoFileDropzoneProps = {
  pickedName: string;
  pickedSizeKb: number;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
};

export function DocumentoFileDropzone({ pickedName, pickedSizeKb, onFileChange, disabled }: DocumentoFileDropzoneProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = useCallback(
    (file: File | null) => {
      if (disabled) return;
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
        onClick={() => !disabled && fileRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all duration-200 ${
          disabled ? "cursor-not-allowed opacity-55" : ""
        } ${
          dragOver
            ? "border-orange-400 bg-orange-500/10 shadow-[0_0_0_3px_color-mix(in_srgb,var(--cab-primary)_25%,transparent)]"
            : "border-zinc-500/70 bg-zinc-950/25 hover:border-orange-500/60 hover:bg-orange-500/5 dark:border-zinc-600 dark:hover:border-orange-500/50"
        }`}
        aria-label="Area caricamento file"
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
        <p className="text-[11px] text-zinc-500">PDF, Word, Excel, PNG, JPG</p>
      </div>
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        accept={ACCEPT}
        disabled={disabled}
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      {pickedName ? (
        <p className="rounded-lg border border-zinc-700/50 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300">
          Selezionato: <span className="font-semibold text-zinc-100">{pickedName}</span>
          {pickedSizeKb > 0 ? <span className="text-zinc-500"> ({pickedSizeKb} KB)</span> : null}
        </p>
      ) : null}
    </div>
  );
}
