"use client";

import { useEffect, useRef, useState } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { useClientLavorazionePhotosQuery } from "@/src/hooks/gestionale/use-client-lavorazione-media-queries";
import type { StoredImage } from "@/lib/media/image-storage";

const DEFAULT_MAX = 5;

function PhotoLightbox({ image, onClose }: { image: StoredImage; onClose: () => void }) {
  return (
    <LavorazioniModalShell onRequestClose={onClose} title="Foto lavorazione">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain p-4 sm:p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.signedUrl}
          alt={image.name}
          className="max-h-[70vh] max-w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-700"
        />
      </div>
    </LavorazioniModalShell>
  );
}

function PhotoThumb({
  image,
  onOpen,
  sizeClass = "h-10 w-10",
}: {
  image: StoredImage;
  onOpen: () => void;
  sizeClass?: string;
}) {
  return (
    <button
      type="button"
      className={`${sizeClass} shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 ring-offset-2 transition hover:ring-2 hover:ring-orange-400/50 dark:border-zinc-700 dark:bg-zinc-800`}
      title={image.name}
      aria-label={`Apri foto ${image.name}`}
      onClick={onOpen}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.signedUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
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
          <PhotoThumb key={img.path} image={img} sizeClass={sizeClass} onOpen={() => setPreview(img)} />
        ))}
      </div>
      {preview ? <PhotoLightbox image={preview} onClose={() => setPreview(null)} /> : null}
    </>
  );
}

export function ClientLavorazionePhotoGallery({
  lavorazioneId,
  max = DEFAULT_MAX,
}: {
  lavorazioneId: string;
  max?: number;
}) {
  const [preview, setPreview] = useState<StoredImage | null>(null);
  const photosQ = useClientLavorazionePhotosQuery(lavorazioneId, { max });
  const loading = photosQ.isLoading && photosQ.data == null;
  const images = photosQ.data ?? [];

  if (loading) return <p className="text-sm text-zinc-500">Caricamento foto…</p>;
  if (images.length === 0) return null;

  return (
    <>
      <ShellCard>
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <PhotoThumb key={img.path} image={img} sizeClass="h-16 w-16 sm:h-20 sm:w-20" onOpen={() => setPreview(img)} />
          ))}
        </div>
      </ShellCard>
      {preview ? <PhotoLightbox image={preview} onClose={() => setPreview(null)} /> : null}
    </>
  );
}
