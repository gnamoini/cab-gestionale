"use client";

import { ClientLavorazioneDocumentsPanel } from "@/components/lavorazioni-clienti/client-lavorazione-documents";
import { ClientLavorazionePhotoGallery } from "@/components/lavorazioni-clienti/client-lavorazione-photos";

export function ClientLavorazioneMediaPanel({ lavorazioneId }: { lavorazioneId: string }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
      <ClientLavorazionePhotoGallery lavorazioneId={lavorazioneId} max={5} embedded />
      <ClientLavorazioneDocumentsPanel lavorazioneId={lavorazioneId} embedded />
    </div>
  );
}
