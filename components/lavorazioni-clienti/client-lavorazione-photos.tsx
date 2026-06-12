"use client";

import { useEffect, useRef, useState } from "react";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { LoadingSpinner } from "@/components/design-system/loading/loading-spinner";
import { GestionaleMediaImage } from "@/components/gestionale/media/gestionale-media-image";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { dsScrollbar } from "@/lib/ui/design-system";
import { useClientLavorazionePhotosQuery } from "@/src/hooks/gestionale/use-client-lavorazione-media-queries";
import type { StoredImage } from "@/lib/media/image-storage";

const DEFAULT_MAX = 5;

function PhotoLightbox({ image, onClose }: { image: StoredImage; onClose: () => void }) {
  return (
    <LavorazioniModalShell modalSize="info" onRequestClose={onClose} title="Foto lavorazione">
      <GestionaleModalScrollBody className="flex min-h-0 items-center justify-center">
        <GestionaleMediaImage
          image={image}
          preset="detail"
          alt={image.name}
          loading="eager"
          className="max-h-[70vh] max-w-full"
          imgClassName="max-h-[70vh] max-w-full rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] object-contain"
        />
      </GestionaleModalScrollBody>
    </LavorazioniModalShell>
  );
}

function PhotoThumb({
  image,
  onOpen,
  sizeClass = "h-16 w-16",
}: {
  image: StoredImage;
  onOpen: () => void;
  sizeClass?: string;
}) {
  const match = sizeClass.match(/h-(\d+)/);
  const px = match ? Number.parseInt(match[1], 10) * 4 : 64;
  const preset = px <= 48 ? "thumbPortal" : "thumb";

  return (
    <button
      type="button"
      className={`${sizeClass} shrink-0 overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] ring-offset-2 transition hover:ring-2 hover:ring-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)]`}
      title={image.name}
      aria-label={`Apri foto ${image.name}`}
      onClick={onOpen}
    >
      <GestionaleMediaImage image={image} preset={preset} alt="" width={px} height={px} />
    </button>
  );
}

export function ClientLavorazionePhotoStrip({
  lavorazioneId,
  max = 3,
  lazy = true,
  sizeClass,
}: {
  lavorazioneId: string;
  max?: number;
  lazy?: boolean;
  sizeClass?: string;
}) {
  const [preview, setPreview] = useState<StoredImage | null>(null);
  const [loaded, setLoaded] = useState(!lazy);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!lazy) {
      setLoaded(true);
      return;
    }
    const node = rootRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLoaded(true);
          obs.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [lazy]);

  const photosQ = useClientLavorazionePhotosQuery(lavorazioneId, { max, enabled: loaded });
  const images = photosQ.data ?? [];

  if (!loaded) {
    return <div ref={rootRef} className="h-10 w-8 shrink-0" aria-hidden />;
  }

  if (images.length === 0) return null;

  return (
    <>
      <div ref={rootRef} className="flex flex-wrap items-center gap-1">
        {images.map((img) => (
          <PhotoThumb key={img.baseName} image={img} sizeClass={sizeClass} onOpen={() => setPreview(img)} />
        ))}
      </div>
      {preview ? <PhotoLightbox image={preview} onClose={() => setPreview(null)} /> : null}
    </>
  );
}

export function ClientLavorazionePhotoGallery({
  lavorazioneId,
  max = DEFAULT_MAX,
  embedded = false,
}: {
  lavorazioneId: string;
  max?: number;
  /** Dentro panoramica dettaglio: GestionaleInfoCard compatto, senza ShellCard. */
  embedded?: boolean;
}) {
  const [preview, setPreview] = useState<StoredImage | null>(null);
  const photosQ = useClientLavorazionePhotosQuery(lavorazioneId, { max });
  const loading = photosQ.isLoading && photosQ.data == null;
  const images = photosQ.data ?? [];

  const subtitle = loading ? (
    <span className="inline-flex items-center gap-1.5">
      <LoadingSpinner size="sm" label="Caricamento foto…" />
      Caricamento foto…
    </span>
  ) : images.length === 0 ? (
    "Nessuna foto caricata"
  ) : (
    `${images.length}/${max} immagini`
  );

  const galleryBody =
    images.length > 0 ? (
      <div className={`flex gap-2 overflow-x-auto pb-1 ${dsScrollbar}`}>
        {images.map((img) => (
          <PhotoThumb key={img.baseName} image={img} onOpen={() => setPreview(img)} />
        ))}
      </div>
    ) : null;

  if (embedded) {
    return (
      <>
        <GestionaleInfoCard compact title="Foto" subtitle={subtitle}>
          {galleryBody}
        </GestionaleInfoCard>
        {preview ? <PhotoLightbox image={preview} onClose={() => setPreview(null)} /> : null}
      </>
    );
  }

  if (loading) return <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento foto…</p>;
  if (images.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <PhotoThumb key={img.baseName} image={img} sizeClass="h-16 w-16 sm:h-20 sm:w-20" onOpen={() => setPreview(img)} />
        ))}
      </div>
      {preview ? <PhotoLightbox image={preview} onClose={() => setPreview(null)} /> : null}
    </>
  );
}
