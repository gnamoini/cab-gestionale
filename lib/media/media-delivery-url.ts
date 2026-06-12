import { buildRequestContextFromClientPath } from "@/lib/decision/request-context";
import { getCachePolicy } from "@/lib/decision/request-decision-registry";

export type MediaDeliveryFormat = "avif" | "webp" | "jpeg";

export type MediaDeliveryUrlOptions = {
  w?: number;
  f?: MediaDeliveryFormat;
};

/** RDR cache policy hint for client media URLs (pure, no fetch). */
export function resolveClientMediaCacheHint(path: string): { cacheable: boolean; ttl: number; tier: string } {
  const ctx = buildRequestContextFromClientPath("/api/media/image", { path });
  const policy = getCachePolicy(ctx);
  return { cacheable: policy.cacheable, ttl: policy.ttl, tier: policy.tier };
}

/** Stable proxy URL for optimized image delivery (immutable cache when path is content-addressed). */
export function buildMediaDeliveryUrl(path: string, options?: MediaDeliveryUrlOptions): string {
  const params = new URLSearchParams();
  params.set("path", path);
  if (options?.w != null && options.w > 0) params.set("w", String(Math.round(options.w)));
  if (options?.f) params.set("f", options.f);
  return `/api/media/image?${params.toString()}`;
}

export function buildMediaSrcSet(
  path: string,
  widths: readonly number[],
  format?: MediaDeliveryFormat,
): string {
  return widths
    .map((w) => `${buildMediaDeliveryUrl(path, { w, f: format })} ${w}w`)
    .join(", ");
}

export const MEDIA_IMAGE_PRESETS = {
  thumb: { display: 64, srcWidth: 128, widths: [128] as const },
  thumbPortal: { display: 48, srcWidth: 96, widths: [96] as const },
  card: { display: 384, widths: [256, 384] as const },
  detail: { display: 1200, widths: [640, 960, 1200] as const },
} as const;

export type MediaImagePreset = keyof typeof MEDIA_IMAGE_PRESETS;

export function mediaDeliveryUrlForPreset(
  path: string,
  preset: MediaImagePreset,
  format?: MediaDeliveryFormat,
): { src: string; srcSet?: string; sizes?: string } {
  const cfg = MEDIA_IMAGE_PRESETS[preset];
  if (preset === "thumb" || preset === "thumbPortal") {
    const w = cfg.widths[0];
    return { src: buildMediaDeliveryUrl(path, { w, f: format ?? "webp" }) };
  }
  const widths = cfg.widths;
  const f = format ?? "webp";
  return {
    src: buildMediaDeliveryUrl(path, { w: widths[widths.length - 1], f }),
    srcSet: buildMediaSrcSet(path, widths, f),
    sizes: `(max-width: 768px) ${widths[0]}px, ${cfg.display}px`,
  };
}
