"use client";

import { useEffect, useRef, useState } from "react";
import { buildDocumentPreviewUrl } from "@/lib/documents/document-preview-url";
import type { DocumentDeliverySource } from "@/lib/documents/document-delivery-types";
import type { LavorazioneDocumentTipo } from "@/src/types/supabase-tables";

type DocumentThumbnailProps = {
  documentId: string;
  source?: DocumentDeliverySource;
  tipo?: LavorazioneDocumentTipo;
  hasPreview: boolean;
  contentVersion?: string;
  eager?: boolean;
  fallback: React.ReactNode;
  className?: string;
  alt?: string;
};

export function DocumentThumbnail({
  documentId,
  source = "archive",
  tipo,
  hasPreview,
  contentVersion,
  eager = false,
  fallback,
  className = "h-8 w-8 shrink-0 rounded-lg object-cover shadow-sm",
  alt = "Anteprima documento",
}: DocumentThumbnailProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hasPreview || eager || failed) return;
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasPreview, eager, failed]);

  if (!hasPreview || failed) {
    return <>{fallback}</>;
  }

  const entityType = source === "lavorazione" ? "lavorazione" : "documento";
  const src = visible
    ? buildDocumentPreviewUrl(documentId, {
        source,
        tipo,
        v: contentVersion,
        entityType,
        entityId: documentId,
      })
    : undefined;

  return (
    <div ref={rootRef} className="shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxy thumbnail URL, not static import
        <img
          src={src}
          alt={alt}
          className={className}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={`${className} animate-pulse bg-[color:color-mix(in_srgb,var(--cab-border)_55%,var(--cab-surface))]`}
          aria-hidden
        />
      )}
    </div>
  );
}
