"use client";

import { HubIconPhoto } from "@/components/design-system/hub-table-action-icons";
import { useEffect, useState } from "react";
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

function deliveryFormatForPath(path: string, isThumb: boolean): "avif" | "webp" {
  if (isThumb) return "webp";
  return path.includes(".avif") ? "avif" : "webp";
}

function resolveDeliveryPath(image: StoredImage, preset: MediaImagePreset): string {
  const isThumb = preset === "thumb" || preset === "thumbPortal";
  return isThumb ? image.thumbPath : image.detailPath;
}

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
  const isThumb = preset === "thumb" || preset === "thumbPortal";
  const baseDeliveryPath = resolveDeliveryPath(image, preset);
  const [deliveryPath, setDeliveryPath] = useState(baseDeliveryPath);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setDeliveryPath(baseDeliveryPath);
    setLoaded(false);
    setFailed(false);
  }, [baseDeliveryPath, image.baseName, preset]);

  const format = deliveryFormatForPath(deliveryPath, isThumb);
  const { src, srcSet, sizes } = mediaDeliveryUrlForPreset(deliveryPath, preset, format);

  const boxW = isThumb ? (width ?? (preset === "thumbPortal" ? 48 : 64)) : width;
  const boxH = isThumb ? (height ?? boxW) : height;

  const showSkeleton = !loaded && !failed;

  return (
    <span
      className={`relative block overflow-hidden ${className}`}
      style={boxW && boxH ? { width: boxW, height: boxH, aspectRatio: `${boxW} / ${boxH}` } : undefined}
    >
      {showSkeleton ? (
        <span
          className="absolute inset-0 animate-pulse bg-[color:color-mix(in_srgb,var(--cab-border)_55%,transparent)]"
          aria-hidden
        />
      ) : null}
      {failed ? (
        <span
          className="absolute inset-0 flex items-center justify-center bg-[color:color-mix(in_srgb,var(--cab-border)_35%,transparent)] text-[color:var(--cab-text-muted)]"
          aria-hidden
        >
          <HubIconPhoto className="h-5 w-5 opacity-45" />
        </span>
      ) : null}
      {!failed ? (
        /* eslint-disable-next-line @next/next/no-img-element, cab-perf/no-img-without-next-image -- Stable /api/media proxy URLs with immutable cache. */
        <img
          key={deliveryPath}
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
          onError={() => {
            if (
              !isThumb &&
              deliveryPath.includes(".avif") &&
              image.fullWebpPath &&
              deliveryPath !== image.fullWebpPath
            ) {
              setDeliveryPath(image.fullWebpPath);
              setLoaded(false);
              return;
            }
            if (!isThumb && deliveryPath !== image.detailPath && image.detailPath !== deliveryPath) {
              setDeliveryPath(image.detailPath);
              setLoaded(false);
              return;
            }
            setFailed(true);
          }}
        />
      ) : null}
    </span>
  );
}
