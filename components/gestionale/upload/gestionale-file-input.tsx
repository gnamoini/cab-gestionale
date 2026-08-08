"use client";

import { Tooltip } from "@/components/ui";
import { useId, type ReactNode } from "react";
import { LoadingSpinner } from "@/components/design-system/loading";
import { UploadStatusInline } from "@/components/gestionale/upload/upload-status-inline";
import type { UploadFeedbackPhase } from "@/lib/upload/upload-feedback-types";
import { dsBtnNeutral, dsDisabled } from "@/lib/ui/design-system";

type GestionaleFileInputProps = {
  accept?: string;
  disabled?: boolean;
  buttonLabel: ReactNode;
  buttonClassName?: string;
  title?: string;
  phase?: UploadFeedbackPhase;
  fileName?: string;
  error?: string | null;
  onRetry?: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showInlineStatus?: boolean;
  statusClassName?: string;
  /** Wrapper esterno (default colonna); usare es. `shrink-0` in gallerie orizzontali. */
  wrapperClassName?: string;
  /** In slot quadrato: solo spinner durante upload, senza testo. */
  busyIconOnly?: boolean;
};

/**
 * Input file nascosto + trigger button con stato upload unificato.
 */
export function GestionaleFileInput({
  accept,
  disabled = false,
  buttonLabel,
  buttonClassName,
  title,
  phase = "idle",
  fileName,
  error,
  onRetry,
  onChange,
  showInlineStatus = true,
  statusClassName,
  wrapperClassName = "flex min-w-0 flex-col gap-2",
  busyIconOnly = false,
}: GestionaleFileInputProps) {
  const inputId = useId();
  const busy = phase === "uploading";
  const inputDisabled = disabled || busy;

  return (
    <div className={wrapperClassName}>
      <Tooltip content={title}><label htmlFor={inputId} className={`${buttonClassName ?? dsBtnNeutral} ${inputDisabled ? `cursor-wait opacity-60 ${dsDisabled}` : "cursor-pointer"}`}>
        {busy ? (busyIconOnly ? (
              <LoadingSpinner size="sm" label="Caricamento…" />
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <LoadingSpinner size="sm" label="Caricamento…" />
                Caricamento…
              </span>
            )) : (buttonLabel)}
        <input id={inputId} type="file" accept={accept} className="sr-only" disabled={inputDisabled} onChange={onChange}/>
      </label></Tooltip>
      {showInlineStatus ? (
        <UploadStatusInline
          phase={phase}
          fileName={fileName}
          error={error}
          onRetry={onRetry}
          className={statusClassName}
          compact
        />
      ) : null}
    </div>
  );
}
