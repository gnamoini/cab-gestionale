import { normalizeHex } from "@/lib/lavorazioni/color-utils";

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (c: number) => Math.min(255, Math.max(0, Math.round(c)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Estrae il colore dominante (saturo, non grigio/bianco/nero) da pixel RGBA. */
export function extractPrimaryColorFromPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): string | null {
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;
      if (a < 128) continue;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2 / 255;
      const d = max - min;
      const s = max === 0 ? 0 : d / max;

      if (l < 0.07 || l > 0.97) continue;
      if (s < 0.1) continue;

      const key = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
      const cur = buckets.get(key);
      if (cur) {
        cur.count += 1;
        cur.r += r;
        cur.g += g;
        cur.b += b;
      } else {
        buckets.set(key, { count: 1, r, g, b });
      }
    }
  }

  let best: { count: number; r: number; g: number; b: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.count > best.count) best = bucket;
  }
  if (!best) return null;

  return normalizeHex(rgbToHex(best.r / best.count, best.g / best.count, best.b / best.count));
}

function extractFromImageElement(img: HTMLImageElement): string | null {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;

  const maxDim = 96;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, cw, ch);
  const { data } = ctx.getImageData(0, 0, cw, ch);
  return extractPrimaryColorFromPixels(data, cw, ch);
}

/** Carica un'immagine e ne ricava il colore primario più adatto all'interfaccia. */
export function extractPrimaryColorFromImageUrl(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      try {
        resolve(extractFromImageElement(img));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}
