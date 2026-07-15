"use client";

import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import {
  CaptureReviewPanelError,
  CaptureReviewPanelFrame,
  CaptureReviewPanelLoading,
} from "@/components/document-capture/capture-review-panel";
import { dsBtnNeutral } from "@/lib/ui/design-system";
import { cabModalZStacked } from "@/lib/ui/mobile-modal-behavior";
import { useCallback, useEffect, useState } from "react";

type CaptureMeta = {
  file_name: string;
  mime: string | null;
  finalized_at: string | null;
};

function isImageMime(mime: string | null | undefined): boolean {
  return (mime ?? "").toLowerCase().startsWith("image/");
}

function isPdfMime(mime: string | null | undefined): boolean {
  return (mime ?? "").toLowerCase().includes("pdf");
}

export function CaptureDocumentFilePreview({
  captureId,
  compact = false,
  /** Anteprima fissa durante scroll review (colonna sinistra desktop). */
  pinned = false,
}: {
  captureId: string;
  compact?: boolean;
  pinned?: boolean;
}) {
  const [meta, setMeta] = useState<CaptureMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/document-capture/${captureId}`);
      if (!res.ok) {
        setError("Anteprima documento non disponibile");
        return;
      }
      const body = (await res.json()) as { capture?: CaptureMeta };
      if (!body.capture?.finalized_at) {
        setError("Anteprima disponibile dopo il caricamento");
        return;
      }
      setMeta(body.capture);
    } catch {
      setError("Anteprima documento non disponibile");
    } finally {
      setLoading(false);
    }
  }, [captureId]);

  useEffect(() => {
    void load();
  }, [load]);

  const fileUrl = `/api/document-capture/${captureId}/file`;
  const frameClass = compact
    ? "max-h-48"
    : pinned
      ? "max-h-[min(calc(100dvh-16rem),32rem)]"
      : "max-h-[min(50vh,28rem)]";
  const pdfFrameClass = pinned ? "h-[min(calc(100dvh-16rem),32rem)]" : "h-[min(50vh,28rem)]";
  const canFullscreen = meta ? isImageMime(meta.mime) || isPdfMime(meta.mime) : false;
  const panelTitle = "Documento caricato";

  if (loading) {
    return (
      <CaptureReviewPanelLoading title={panelTitle} message="Caricamento anteprima…" skeleton="preview" />
    );
  }

  if (error || !meta) {
    return (
      <CaptureReviewPanelError
        title={panelTitle}
        message={error ?? "Anteprima non disponibile"}
        onRetry={() => void load()}
      />
    );
  }

  const fullscreenAction = canFullscreen ? (
    <button
      type="button"
      className="text-xs text-[color:var(--cab-accent-fg)] underline"
      onClick={() => setFullscreenOpen(true)}
    >
      Apri a schermo intero
    </button>
  ) : null;

  return (
    <>
      <CaptureReviewPanelFrame title={panelTitle} action={fullscreenAction}>
        <div
          className={`overflow-auto rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)] ${frameClass}`}
        >
          {isImageMime(meta.mime) ? (
            <button
              type="button"
              className="block w-full cursor-zoom-in transition-shadow hover:shadow-[var(--cab-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cab-primary)]"
              aria-label={`Apri ${meta.file_name} a schermo intero`}
              onClick={() => setFullscreenOpen(true)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- authenticated capture file route */}
              <img
                src={fileUrl}
                alt={meta.file_name}
                className="mx-auto block h-auto w-full max-w-full"
              />
            </button>
          ) : isPdfMime(meta.mime) ? (
            <button
              type="button"
              className="block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cab-primary)]"
              aria-label={`Apri ${meta.file_name} a schermo intero`}
              onClick={() => setFullscreenOpen(true)}
            >
              <iframe title={meta.file_name} src={fileUrl} className={`pointer-events-none w-full bg-white ${pdfFrameClass}`} />
            </button>
          ) : (
            <div className="p-4 text-sm text-[color:var(--cab-muted-fg)]">
              <p>{meta.file_name}</p>
              <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block underline">
                Scarica file
              </a>
            </div>
          )}
        </div>
      </CaptureReviewPanelFrame>

      {fullscreenOpen && canFullscreen ? (
        <GestionaleModalShell
          modalSize="fullscreen"
          onRequestClose={() => setFullscreenOpen(false)}
          title={meta.file_name}
          titleId="capture-doc-fullscreen-title"
          layerClassName={`!bg-black/70 ${cabModalZStacked}`}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-auto p-4">
            {isImageMime(meta.mime) ? (
              // eslint-disable-next-line @next/next/no-img-element -- authenticated capture file route
              <img
                src={fileUrl}
                alt={meta.file_name}
                className="max-h-[min(88dvh,960px)] max-w-full rounded-[var(--ds-radius-lg)] object-contain shadow-2xl"
              />
            ) : (
              <iframe
                title={meta.file_name}
                src={fileUrl}
                className="h-[min(88dvh,900px)] w-full max-w-5xl rounded-[var(--ds-radius-lg)] bg-white shadow-2xl"
              />
            )}
            <div className="mt-3 flex w-full max-w-5xl justify-end border-t border-[color:var(--cab-border)] pt-3">
              <button type="button" className={dsBtnNeutral} onClick={() => setFullscreenOpen(false)}>
                Chiudi
              </button>
            </div>
          </div>
        </GestionaleModalShell>
      ) : null}
    </>
  );
}
