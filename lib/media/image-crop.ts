/** Ritaglio immagine lato client (canvas) — usato prima dell'upload foto gestionale. */

export type ImageCropPanZoom = {
  /** Moltiplicatore sopra la scala base «cover». */
  zoom: number;
  /** Pan in px viewport (spostamento angolo sup-sin immagine). */
  offsetX: number;
  offsetY: number;
};

export type ImageCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageCropLayout = ImageCropPanZoom & {
  baseScale: number;
  displayWidth: number;
  displayHeight: number;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export function clampImageCropZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Scala base cover + pan centrato in viewport quadrata. */
export function initialImageCropLayout(
  naturalWidth: number,
  naturalHeight: number,
  viewportSize: number,
): ImageCropLayout {
  const baseScale = Math.max(viewportSize / naturalWidth, viewportSize / naturalHeight);
  const zoom = 1;
  const displayWidth = naturalWidth * baseScale * zoom;
  const displayHeight = naturalHeight * baseScale * zoom;
  return {
    zoom,
    baseScale,
    displayWidth,
    displayHeight,
    offsetX: (viewportSize - displayWidth) / 2,
    offsetY: (viewportSize - displayHeight) / 2,
  };
}

export function imageCropDisplaySize(
  naturalWidth: number,
  naturalHeight: number,
  layout: Pick<ImageCropLayout, "baseScale" | "zoom">,
): { displayWidth: number; displayHeight: number } {
  const scale = layout.baseScale * layout.zoom;
  return {
    displayWidth: naturalWidth * scale,
    displayHeight: naturalHeight * scale,
  };
}

/** Mantiene il viewport sempre coperto dall'immagine. */
export function clampImageCropPan(
  naturalWidth: number,
  naturalHeight: number,
  viewportSize: number,
  layout: Pick<ImageCropLayout, "baseScale" | "zoom">,
  offsetX: number,
  offsetY: number,
): { offsetX: number; offsetY: number } {
  const { displayWidth, displayHeight } = imageCropDisplaySize(naturalWidth, naturalHeight, layout);
  const minX = viewportSize - displayWidth;
  const minY = viewportSize - displayHeight;
  return {
    offsetX: Math.min(0, Math.max(minX, offsetX)),
    offsetY: Math.min(0, Math.max(minY, offsetY)),
  };
}

export function computeImageCropRect(
  naturalWidth: number,
  naturalHeight: number,
  viewportSize: number,
  layout: ImageCropLayout,
): ImageCropRect {
  const scale = layout.baseScale * layout.zoom;
  const rawX = -layout.offsetX / scale;
  const rawY = -layout.offsetY / scale;
  const rawW = viewportSize / scale;
  const rawH = viewportSize / scale;
  const x = Math.max(0, Math.min(naturalWidth - 1, rawX));
  const y = Math.max(0, Math.min(naturalHeight - 1, rawY));
  const width = Math.max(1, Math.min(naturalWidth - x, rawW));
  const height = Math.max(1, Math.min(naturalHeight - y, rawH));
  return { x, y, width, height };
}

export async function cropImageFile(
  file: File,
  crop: ImageCropRect,
  fileName = file.name.replace(/\.[^.]+$/, "") || "foto",
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossibile preparare il ritaglio.");
  ctx.drawImage(
    bitmap,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  bitmap.close?.();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Ritaglio non riuscito."))),
      "image/jpeg",
      0.92,
    );
  });
  return new File([blob], `${fileName.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
}
