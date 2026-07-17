"use client";

import { useEffect, useRef, useState } from "react";
import { ClientLavorazioneDocumentsPanel } from "@/components/lavorazioni-clienti/client-lavorazione-documents";
import { ClientLavorazionePhotoGallery } from "@/components/lavorazioni-clienti/client-lavorazione-photos";

export function ClientLavorazioneMediaPanel({ lavorazioneId }: { lavorazioneId: string }) {
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
      {visible ? (
        <>
          <ClientLavorazionePhotoGallery lavorazioneId={lavorazioneId} max={5} embedded />
          <ClientLavorazioneDocumentsPanel lavorazioneId={lavorazioneId} embedded />
        </>
      ) : (
        <div className="col-span-full min-h-[8rem]" aria-hidden />
      )}
    </div>
  );
}
