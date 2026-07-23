"use client";

import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { CaptureDocumentZoomPanViewport } from "@/components/document-capture/capture-document-zoom-pan-viewport";
import {
  CaptureReviewPanelError,
  CaptureReviewPanelFrame,
  CaptureReviewPanelLoading,
} from "@/components/document-capture/capture-review-panel";
import { cabModalZStacked } from "@/lib/ui/mobile-modal-behavior";
import { capturePdfFullscreenUrl, capturePdfPreviewFrameUrl } from "@/lib/document-capture/capture-pdf-preview-url";
import { memo, useCallback, useEffect, useRef, useState } from "react";

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

function CaptureDocumentFilePreviewInner({
  captureId,
  compact = false,
  /** Anteprima fissa durante scroll review (colonna sinistra desktop). */
  pinned = false,
  /** Riempie l'altezza della colonna scroll (variant panel). */
  columnFill = false,
}: {
  captureId: string;
  compact?: boolean;
  pinned?: boolean;
  columnFill?: boolean;
}) {
  const [meta, setMeta] = useState<CaptureMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const pdfShellRef = useRef<HTMLDivElement>(null);
  const [pdfViewportWidth, setPdfViewportWidth] = useState(0);
  const [measuredDocHeight, setMeasuredDocHeight] = useState(0);

  const syncPdfFrameHeight = useCallback((frame: HTMLIFrameElement) => {
    try {
      const inner = frame.contentDocument?.querySelector("iframe") as HTMLIFrameElement | null;
      const body = frame.contentDocument?.body;
      const measured = inner?.offsetHeight ?? body?.scrollHeight ?? 0;
      if (measured > 0) setMeasuredDocHeight(Math.ceil(measured));
    } catch {
      /* cross-origin — non atteso su preview-frame same-origin */
    }
  }, []);

  const onImageMeasured = useCallback((img: HTMLImageElement) => {
    const h = img.offsetHeight;
    if (h > 0) setMeasuredDocHeight(h);
  }, []);

  const openFullscreen = useCallback(() => {
    setFullscreenOpen(true);
  }, []);

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

  useEffect(() => {
    const el = pdfShellRef.current;
    if (!el) return;
    const sync = () => {
      const w = Math.max(1, Math.round(el.clientWidth));
      setPdfViewportWidth(w);
      setMeasuredDocHeight(0);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [meta?.mime, compact, pinned, columnFill]);

  const fileUrl = `/api/document-capture/${captureId}/file`;
  const pdfPreviewUrl = capturePdfPreviewFrameUrl(
    captureId,
    pdfViewportWidth > 0 ? pdfViewportWidth : undefined,
  );
  const pdfFullscreenUrl = capturePdfFullscreenUrl(fileUrl);
  const frameClass = compact
    ? "max-h-48"
    : columnFill
      ? "min-h-[12rem] flex-1"
      : pinned
        ? "max-h-[min(calc(100dvh-13rem),40rem)]"
        : "max-h-[min(50vh,28rem)]";
  const pdfShellClass = compact
    ? "h-48"
    : columnFill
      ? "min-h-[12rem] flex-1"
      : pinned
        ? "h-[min(calc(100dvh-13rem),40rem)]"
        : "h-[min(50vh,28rem)]";
  const canFullscreen = meta ? isImageMime(meta.mime) || isPdfMime(meta.mime) : false;
  const panelTitle = "Documento caricato";
  const enableZoomPan = !compact;
  const docNaturalWidth = Math.max(1, pdfViewportWidth);
  const docNaturalHeight =
    measuredDocHeight > 0 ? measuredDocHeight : Math.max(1, Math.round(docNaturalWidth * 1.414));

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
      onClick={openFullscreen}
    >
      Apri a schermo intero
    </button>
  ) : null;

  return (
    <>
      <CaptureReviewPanelFrame
        title={panelTitle}
        action={fullscreenAction}
        className={columnFill ? "flex min-h-0 h-full flex-col" : ""}
      >
        {isImageMime(meta.mime) ? (
          enableZoomPan ? (
            <div ref={pdfShellRef} className={`min-h-0 ${pdfShellClass}`}>
              {pdfViewportWidth > 0 ? (
                <CaptureDocumentZoomPanViewport
                  shellClassName="h-full min-h-0"
                  naturalWidth={docNaturalWidth}
                  naturalHeight={docNaturalHeight}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- authenticated capture file route */}
                  <img
                    src={fileUrl}
                    alt={meta.file_name}
                    className="pointer-events-none block h-auto w-full max-w-full select-none"
                    draggable={false}
                    onLoad={(e) => onImageMeasured(e.currentTarget)}
                  />
                </CaptureDocumentZoomPanViewport>
              ) : (
                <div
                  className={`rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)] ${pdfShellClass}`}
                  aria-hidden
                />
              )}
            </div>
          ) : (
            <div
              className={`overflow-auto rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)] ${frameClass}`}
            >
              <button
                type="button"
                className="block w-full cursor-zoom-in transition-shadow hover:shadow-[var(--cab-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cab-primary)]"
                aria-label={`Apri ${meta.file_name} a schermo intero`}
                onClick={openFullscreen}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- authenticated capture file route */}
                <img
                  src={fileUrl}
                  alt={meta.file_name}
                  className="mx-auto block h-auto w-full max-w-full"
                />
              </button>
            </div>
          )
        ) : isPdfMime(meta.mime) ? (
          <div ref={pdfShellRef} className={`min-h-0 ${pdfShellClass}`}>
            {enableZoomPan ? (
              pdfViewportWidth > 0 ? (
                <CaptureDocumentZoomPanViewport
                  shellClassName="h-full min-h-0"
                  naturalWidth={docNaturalWidth}
                  naturalHeight={docNaturalHeight}
                >
                  <iframe
                    key={pdfViewportWidth > 0 ? `pdf-${pdfViewportWidth}` : "pdf-default"}
                    title={meta.file_name}
                    src={pdfPreviewUrl}
                    className="pointer-events-none block h-full w-full border-0 bg-[color:var(--cab-surface-muted)]"
                    onLoad={(e) => syncPdfFrameHeight(e.currentTarget)}
                  />
                </CaptureDocumentZoomPanViewport>
              ) : (
                <div
                  className={`rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)] ${pdfShellClass}`}
                  aria-hidden
                />
              )
            ) : (
              <div
                className={`overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)] ${pdfShellClass}`}
              >
                <iframe
                  key={pdfViewportWidth > 0 ? `pdf-${pdfViewportWidth}` : "pdf-default"}
                  title={meta.file_name}
                  src={pdfPreviewUrl}
                  className="block h-full w-full border-0 bg-[color:var(--cab-surface-muted)]"
                />
              </div>
            )}
          </div>
        ) : (
          <div
            className={`overflow-auto rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)] ${frameClass}`}
          >
            <div className="p-4 text-sm text-[color:var(--cab-muted-fg)]">
              <p>{meta.file_name}</p>
              <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block underline">
                Scarica file
              </a>
            </div>
          </div>
        )}
      </CaptureReviewPanelFrame>

      {fullscreenOpen && canFullscreen ? (
        <GestionaleModalShell
          modalSize="fullscreen"
          onRequestClose={() => setFullscreenOpen(false)}
          title={meta.file_name}
          titleId="capture-doc-fullscreen-title"
          layerClassName={`!z-[110] !bg-black/90 md:!items-stretch md:!justify-stretch md:!p-0 ${cabModalZStacked}`}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {isImageMime(meta.mime) ? (
              // eslint-disable-next-line @next/next/no-img-element -- authenticated capture file route
              <img
                src={fileUrl}
                alt={meta.file_name}
                className="mx-auto h-full max-h-full w-full max-w-full object-contain p-4"
              />
            ) : (
              <iframe
                title={meta.file_name}
                src={pdfFullscreenUrl}
                className="min-h-0 h-full w-full flex-1 border-0 bg-[color:var(--cab-surface-muted)]"
              />
            )}
          </div>
        </GestionaleModalShell>
      ) : null}
    </>
  );
}

export const CaptureDocumentFilePreview = memo(CaptureDocumentFilePreviewInner);
