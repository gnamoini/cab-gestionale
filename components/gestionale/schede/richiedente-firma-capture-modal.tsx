"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import {
  drawSignaturePadSegment,
  exportSignatureDataUrl,
  hasSignatureDataUrl,
  setupSignaturePadContext,
  type SignaturePadPoint,
} from "@/lib/media/signature-pad";
import { dsBtnNeutral, dsBtnPrimary, dsTypoCaption } from "@/lib/ui/design-system";

type Point = SignaturePadPoint;

function clientPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

export function RichiedenteFirmaCaptureModal({
  open,
  initialDataUrl = "",
  onClose,
  onSave,
  title = "Firma richiedente",
  titleId = "richiedente-firma-capture-title",
}: {
  open: boolean;
  initialDataUrl?: string;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  title?: string;
  titleId?: string;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncCanvasToPad = useCallback(() => {
    const container = padRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return null;

    const cssW = container.clientWidth;
    const cssH = container.clientHeight;
    if (cssW <= 0 || cssH <= 0) return null;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, cssW, cssH };
  }, []);

  const resetPad = useCallback(
    (restoreInitial = false) => {
      const synced = syncCanvasToPad();
      if (!synced) return;
      const { ctx, cssW, cssH } = synced;
      setupSignaturePadContext(ctx, cssW, cssH);
      hasInkRef.current = false;
      setHasInk(false);
      setError(null);
      if (restoreInitial && hasSignatureDataUrl(initialDataUrl)) {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          const live = canvas?.getContext("2d");
          if (!canvas || !live) return;
          live.drawImage(img, 0, 0, cssW, cssH);
          hasInkRef.current = true;
          setHasInk(true);
        };
        img.onerror = () => {
          setError("Impossibile caricare la firma acquisita.");
        };
        img.src = initialDataUrl;
      }
    },
    [initialDataUrl, syncCanvasToPad],
  );

  useLayoutEffect(() => {
    if (!open) return;
    resetPad(true);
  }, [open, initialDataUrl, resetPad]);

  useEffect(() => {
    if (!open) return;
    const container = padRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!hasInkRef.current) {
        if (hasSignatureDataUrl(initialDataUrl)) {
          resetPad(true);
          return;
        }
        syncCanvasToPad();
        return;
      }
      const snapshot = canvas.toDataURL();
      const synced = syncCanvasToPad();
      if (!synced) return;
      const { ctx, cssW, cssH } = synced;
      setupSignaturePadContext(ctx, cssW, cssH);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, cssW, cssH);
      };
      img.src = snapshot;
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, [open, initialDataUrl, resetPad, syncCanvasToPad]);

  const drawLine = useCallback((from: Point, to: Point) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawSignaturePadSegment(ctx, from, to);
    hasInkRef.current = true;
    setHasInk(true);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      const p = clientPoint(canvas, e.clientX, e.clientY);
      lastPointRef.current = p;
      drawLine(p, p);
      setError(null);
    },
    [drawLine],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const canvas = canvasRef.current;
      const last = lastPointRef.current;
      if (!canvas || !last) return;
      const p = clientPoint(canvas, e.clientX, e.clientY);
      drawLine(last, p);
      lastPointRef.current = p;
    },
    [drawLine],
  );

  const endStroke = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* già rilasciato */
    }
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setError("Area firma non disponibile.");
      return;
    }
    if (!hasInkRef.current) {
      if (hasSignatureDataUrl(initialDataUrl)) {
        onSave(initialDataUrl.trim());
        onClose();
        return;
      }
      setError("Disegna la firma prima di salvare.");
      return;
    }
    onSave(exportSignatureDataUrl(canvas));
    onClose();
  }, [initialDataUrl, onClose, onSave]);

  if (!open) return null;

  return (
    <GestionaleModalShell
      modalSize="formMedium"
      onRequestClose={onClose}
      title={title}
      titleId={titleId}
    >
      <div className="space-y-3 p-4">
        <p className={dsTypoCaption}>Firma con dito o pennino nell&apos;area bianca.</p>
        <div
          ref={padRef}
          className="relative h-[12.5rem] min-h-[12.5rem] w-full overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-white"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 block h-full w-full touch-none cursor-crosshair"
            aria-label="Area firma"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            onPointerLeave={endStroke}
          />
        </div>
        {error ? <p className="text-xs text-[color:var(--cab-danger)]">{error}</p> : null}
        {!hasInk ? (
          <p className={dsTypoCaption}>La firma verrà salvata nella scheda ingresso.</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[color:var(--cab-border)] p-3">
        <button type="button" className={dsBtnNeutral} onClick={() => resetPad(false)}>
          Cancella
        </button>
        <button type="button" className={dsBtnNeutral} onClick={onClose}>
          Chiudi
        </button>
        <button type="button" className={dsBtnPrimary} onClick={handleSave}>
          Salva firma
        </button>
      </div>
    </GestionaleModalShell>
  );
}
