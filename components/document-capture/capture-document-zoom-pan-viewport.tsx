"use client";

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 5;

export function CaptureDocumentZoomPanViewport({
  children,
  shellClassName = "",
  naturalWidth,
  naturalHeight,
}: {
  children: ReactNode;
  shellClassName?: string;
  naturalWidth: number;
  naturalHeight: number;
}) {
  const [zoom, setZoom] = useState(100);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  const zoomFactor = zoom / 100;
  const contentW = Math.max(1, Math.round(naturalWidth * zoomFactor));
  const contentH = Math.max(1, Math.round(naturalHeight * zoomFactor));

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !el) return;
    el.scrollLeft = drag.scrollLeft - (e.clientX - drag.startX);
    el.scrollTop = drag.scrollTop - (e.clientY - drag.startY);
  }, []);

  const endDrag = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      scrollRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* già rilasciato */
    }
  }, []);

  return (
    <div className={`flex min-h-0 flex-col gap-2 ${shellClassName}`.trim()}>
      <div className="flex min-w-0 items-center gap-2">
        <label htmlFor="capture-doc-zoom" className="shrink-0 text-xs text-[color:var(--cab-text-muted)]">
          Zoom
        </label>
        <input
          id="capture-doc-zoom"
          type="range"
          min={Math.round(ZOOM_MIN * 100)}
          max={Math.round(ZOOM_MAX * 100)}
          step={ZOOM_STEP}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="min-w-0 flex-1 accent-[color:var(--cab-primary)]"
          aria-valuemin={Math.round(ZOOM_MIN * 100)}
          aria-valuemax={Math.round(ZOOM_MAX * 100)}
          aria-valuenow={zoom}
        />
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-[color:var(--cab-text-muted)]">
          {zoom}%
        </span>
        <span className="sr-only">Trascina il documento per spostarlo quando lo zoom è maggiore di 100%</span>
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)] gestionale-scrollbar cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="relative" style={{ width: contentW, height: contentH }}>
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: naturalWidth,
              height: naturalHeight,
              transform: `scale(${zoomFactor})`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
