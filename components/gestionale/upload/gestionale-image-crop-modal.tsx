"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GestionaleModalFooterActions,
  GestionaleModalFooterCancelButton,
  GestionaleModalFooterSaveButton,
  gestionaleModalFooterActionsStackMobileWrapClass,
} from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import {
  clampImageCropPan,
  clampImageCropZoom,
  computeImageCropRect,
  cropImageFile,
  imageCropDisplaySize,
  initialImageCropLayout,
  type ImageCropLayout,
} from "@/lib/media/image-crop";
import { cabModalZStacked } from "@/lib/ui/mobile-modal-behavior";
import { dsFocus } from "@/lib/ui/design-system";

type GestionaleImageCropModalProps = {
  file: File | null;
  onClose: () => void;
  onConfirm: (file: File) => void | Promise<void>;
  title?: string;
};

const VIEWPORT_SIZE = 300;

export function GestionaleImageCropModal({
  file,
  onClose,
  onConfirm,
  title = "Ritaglia foto",
}: GestionaleImageCropModalProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [layout, setLayout] = useState<ImageCropLayout | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  );

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      setNaturalSize(null);
      setLayout(null);
      setError(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setError(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const updateLayout = useCallback(
    (patch: Partial<ImageCropLayout>) => {
      if (!naturalSize) return;
      setLayout((prev) => {
        const base = prev ?? initialImageCropLayout(naturalSize.width, naturalSize.height, VIEWPORT_SIZE);
        const next: ImageCropLayout = { ...base, ...patch };
        const { displayWidth, displayHeight } = imageCropDisplaySize(naturalSize.width, naturalSize.height, next);
        const pan = clampImageCropPan(
          naturalSize.width,
          naturalSize.height,
          VIEWPORT_SIZE,
          next,
          next.offsetX,
          next.offsetY,
        );
        return { ...next, displayWidth, displayHeight, ...pan };
      });
    },
    [naturalSize],
  );

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (!width || !height) return;
    setNaturalSize({ width, height });
    setLayout(initialImageCropLayout(width, height, VIEWPORT_SIZE));
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!layout || busy) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: layout.offsetX,
        originY: layout.offsetY,
      };
    },
    [busy, layout],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId || !naturalSize || !layout) return;
      updateLayout({
        offsetX: drag.originX + (e.clientX - drag.startX),
        offsetY: drag.originY + (e.clientY - drag.startY),
      });
    },
    [layout, naturalSize, updateLayout],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!file || !layout || !naturalSize) return;
    setBusy(true);
    setError(null);
    try {
      const crop = computeImageCropRect(naturalSize.width, naturalSize.height, VIEWPORT_SIZE, layout);
      const cropped = await cropImageFile(file, crop);
      await onConfirm(cropped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ritaglio non riuscito.");
    } finally {
      setBusy(false);
    }
  }, [file, layout, naturalSize, onConfirm]);

  const imageStyle = useMemo(() => {
    if (!layout) return undefined;
    return {
      width: `${layout.displayWidth}px`,
      height: `${layout.displayHeight}px`,
      transform: `translate(${layout.offsetX}px, ${layout.offsetY}px)`,
    } as const;
  }, [layout]);

  if (!file) return null;

  return (
    <GestionaleModalShell
      modalSize="formSmall"
      title={title}
      titleId="gestionale-image-crop-title"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
      layerClassName={cabModalZStacked}
      footer={
        <GestionaleModalFooterActions className={gestionaleModalFooterActionsStackMobileWrapClass}>
          <GestionaleModalFooterCancelButton
            className="w-full justify-center sm:w-auto"
            onClick={onClose}
            disabled={busy}
          />
          <GestionaleModalFooterSaveButton
            type="button"
            className="w-full justify-center sm:w-auto"
            onClick={() => void handleConfirm()}
            disabled={busy || !layout || !naturalSize}
            loading={busy}
            loadingLabel="Ritaglio…"
          >
            Usa foto
          </GestionaleModalFooterSaveButton>
        </GestionaleModalFooterActions>
      }
    >
      <div className="space-y-3 px-1 pb-2 pt-1">
        <p className="text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
          Trascina per spostare e regola lo zoom. Il riquadro centrale è l&apos;area salvata.
        </p>
        <div
          className={`relative mx-auto h-[300px] w-[300px] max-w-full touch-none overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_70%,var(--cab-card))] ${dsFocus}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="application"
          aria-label="Area ritaglio foto"
        >
          {objectUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Blob locale per ritaglio interattivo.
            <img
              src={objectUrl}
              alt=""
              draggable={false}
              onLoad={onImageLoad}
              className="absolute left-0 top-0 max-w-none select-none"
              style={imageStyle}
            />
          ) : null}
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))]"
            aria-hidden
          />
        </div>
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-[color:var(--cab-text-muted)]">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={layout?.zoom ?? 1}
            disabled={!layout || busy}
            onChange={(e) => updateLayout({ zoom: clampImageCropZoom(Number(e.target.value)) })}
            className="w-full accent-[var(--cab-primary)]"
            aria-label="Zoom ritaglio"
          />
        </label>
        {error ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            {error}
          </p>
        ) : null}
      </div>
    </GestionaleModalShell>
  );
}
