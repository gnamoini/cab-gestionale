"use client";

import { useCallback, useState, type ReactNode } from "react";
import { HubIconUpload } from "@/components/design-system/hub-table-action-icons";
import { useFileDragZone } from "@/hooks/use-file-drag-zone";
import { fileMatchesAccept } from "@/lib/upload/file-accept";
import {
  dsUploadDropExpand,
  dsUploadDropExpandActive,
  dsUploadDropOverlay,
  dsUploadDropOverlayActive,
} from "@/lib/ui/design-system";

export type GestionaleUploadDropExpandProps = {
  accept?: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  validateFile?: (file: File) => string | null;
  dropTitle?: string;
  dropHint?: string;
  /** Overlay a tutta card durante il drag (layout hub). */
  overlay?: boolean;
  className?: string;
  children: ReactNode;
};

function DropExpandBand({
  dropTitle,
  dropHint,
}: {
  dropTitle: string;
  dropHint?: string;
}) {
  return (
    <>
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_18%,var(--cab-surface))] text-[color:var(--cab-primary)]"
        aria-hidden
      >
        <HubIconUpload className="h-5 w-5 shrink-0" />
      </span>
      <p className="text-sm font-semibold text-[color:var(--cab-text)]">{dropTitle}</p>
      {dropHint ? (
        <p className="text-[11px] leading-snug text-[color:var(--cab-text-muted)]">{dropHint}</p>
      ) : null}
    </>
  );
}

/** Overlay compatto per card hub (~una riga): resta dentro i bordi arrotondati. */
function DropOverlayCompact({
  dropTitle,
  dropHint,
}: {
  dropTitle: string;
  dropHint?: string;
}) {
  return (
    <div className="flex min-w-0 max-w-full items-center justify-center gap-2 px-1">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-surface))] text-[color:var(--cab-primary)]"
        aria-hidden
      >
        <HubIconUpload className="h-3.5 w-3.5 shrink-0" />
      </span>
      <div className="min-w-0 text-left">
        <p className="truncate text-xs font-semibold leading-tight text-[color:var(--cab-text)]">{dropTitle}</p>
        {dropHint ? (
          <p className="truncate text-[10px] leading-tight text-[color:var(--cab-text-muted)]">{dropHint}</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Avvolge una sezione upload compatta: al drag di un file dal desktop espande
 * un'area drop CAB-styled (sotto i figli, o overlay su tutta la card con `overlay`).
 */
export function GestionaleUploadDropExpand({
  accept,
  disabled = false,
  onFile,
  validateFile,
  dropTitle = "Trascina il file qui",
  dropHint,
  overlay = false,
  className = "",
  children,
}: GestionaleUploadDropExpandProps) {
  const [localError, setLocalError] = useState<string | null>(null);

  const handleDropFile = useCallback(
    (file: File) => {
      if (disabled) return;
      setLocalError(null);

      if (!fileMatchesAccept(file, accept)) {
        setLocalError("Tipo di file non supportato.");
        return;
      }

      const validationError = validateFile?.(file) ?? null;
      if (validationError) {
        setLocalError(validationError);
        return;
      }

      onFile(file);
    },
    [accept, disabled, onFile, validateFile],
  );

  const { dragActive, dropZoneProps } = useFileDragZone({
    disabled,
    onDropFile: handleDropFile,
  });

  const showDrop = dragActive && !disabled;
  const wrapperClass = overlay
    ? `relative min-w-0 overflow-hidden rounded-[var(--ds-radius-lg)]${className ? ` ${className}` : ""}`
    : `relative min-w-0${className ? ` ${className}` : ""}`;

  return (
    <div className={wrapperClass} {...dropZoneProps}>
      <div
        className={
          showDrop && overlay
            ? "pointer-events-none rounded-[inherit] opacity-0 transition-opacity duration-150"
            : undefined
        }
        aria-hidden={showDrop && overlay ? true : undefined}
      >
        {children}
      </div>
      {showDrop && overlay ? (
        <div
          className={`${dsUploadDropOverlay} ${dsUploadDropOverlayActive}`}
          role="region"
          aria-label="Area rilascio file"
          aria-live="polite"
        >
          <DropOverlayCompact dropTitle={dropTitle} dropHint={dropHint} />
        </div>
      ) : null}
      {showDrop && !overlay ? (
        <div
          className={`mt-3 ${dsUploadDropExpand} ${dsUploadDropExpandActive}`}
          role="region"
          aria-label="Area rilascio file"
          aria-live="polite"
        >
          <DropExpandBand dropTitle={dropTitle} dropHint={dropHint} />
        </div>
      ) : null}
      {localError ? (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          {localError}
        </p>
      ) : null}
    </div>
  );
}
