"use client";

import { ClientLavorazioneDocumentsPanel } from "@/components/lavorazioni-clienti/client-lavorazione-documents";
import { ClientLavorazionePhotoGallery } from "@/components/lavorazioni-clienti/client-lavorazione-photos";
import { dsGapMd } from "@/lib/ui/design-system";

export function ClientLavorazioneMediaPanel({ lavorazioneId }: { lavorazioneId: string }) {
  return (
    <div className={`flex min-w-0 flex-col ${dsGapMd}`}>
      <ClientLavorazionePhotoGallery lavorazioneId={lavorazioneId} max={5} embedded />
      <ClientLavorazioneDocumentsPanel lavorazioneId={lavorazioneId} embedded />
    </div>
  );
}
