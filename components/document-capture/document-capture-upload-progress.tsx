"use client";

import { LoadingSpinner } from "@/components/design-system/loading";
import type { DocumentCaptureUploadPhase } from "@/lib/document-capture/use-document-capture-upload";

const LABELS: Record<DocumentCaptureUploadPhase, string> = {
  idle: "Pronto",
  uploading: "Caricamento…",
  finalizing: "Verifica documento…",
  success: "Documento acquisito",
  error: "Errore upload",
  duplicate: "Duplicato rilevato",
};

export function DocumentCaptureUploadProgress(props: {
  phase: DocumentCaptureUploadPhase;
  progress: number;
  error?: string | null;
}) {
  if (props.phase === "idle") return null;

  return (
    <div
      className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-3 text-sm"
      role="status"
    >
      <div className="flex items-center gap-2">
        {(props.phase === "uploading" || props.phase === "finalizing") && <LoadingSpinner size="sm" />}
        <span>{LABELS[props.phase]}</span>
      </div>
      {props.phase !== "error" && props.phase !== "duplicate" ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--cab-muted)]">
          <div
            className="h-full bg-[var(--cab-accent)] transition-[width]"
            style={{ width: `${Math.round(props.progress * 100)}%` }}
          />
        </div>
      ) : null}
      {props.error ? <p className="mt-2 text-[color:var(--cab-danger)]">{props.error}</p> : null}
    </div>
  );
}
