"use client";

import { useState } from "react";
import type { StoredImage } from "@/lib/media/image-storage";
import {
  mediaDeliveryUrlForPreset,
  type MediaImagePreset,
} from "@/lib/media/media-delivery-url";

type GestionaleMediaImageProps = {
  image: StoredImage;
  preset: MediaImagePreset;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
  width?: number;
  height?: number;
};

export function GestionaleMediaImage({
  image,
  preset,
  alt,
  className = "",
  imgClassName = "h-full w-full object-cover",
  loading = "lazy",
  width,
  height,
}: GestionaleMediaImageProps) {
  const [loaded, setLoaded] = useState(false);
  const isThumb = preset === "thumb" || preset === "thumbPortal";
  const deliveryPath = isThumb ? image.thumbPath : image.fullPath;
  const format = isThumb ? "webp" : image.fullPath.includes(".avif") ? "avif" : "webp";
  const { src, srcSet, sizes } = mediaDeliveryUrlForPreset(deliveryPath, preset, format);

  const boxW = isThumb ? (width ?? (preset === "thumbPortal" ? 48 : 64)) : width;
  const boxH = isThumb ? (height ?? boxW) : height;

  return (
    <span
      className={`relative block overflow-hidden ${className}`}
      style={boxW && boxH ? { width: boxW, height: boxH, aspectRatio: `${boxW} / ${boxH}` } : undefined}
    >
      {!loaded ? (
        <span
          className="absolute inset-0 animate-pulse bg-[color:color-mix(in_srgb,var(--cab-border)_55%,transparent)]"
          aria-hidden
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element -- Stable /api/media proxy URLs with immutable cache. */}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={boxW}
        height={boxH}
        loading={loading}
        decoding="async"
        className={`${imgClassName}${loaded ? "" : " opacity-0"}`}
        onLoad={() => setLoaded(true)}
      />
    </span>
  );
}
